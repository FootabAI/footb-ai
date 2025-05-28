import { create } from "zustand";
import { generatePlayerImages } from "@/api";
import { Player } from "@/types/team";
import { db, storage } from "@/firebaseConfig";
import { doc, updateDoc, getDoc, runTransaction, DocumentReference } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

type BackgroundImageState = {
  isGenerating: boolean;
  progress: number;
  generationId: string | null;
  processedPlayers: Set<string>;
  startGeneration: (teamId: string, players: Player[], nationality: string) => Promise<void>;
  stopGeneration: () => void;
};

export const useBackgroundImageStore = create<BackgroundImageState>((set, get) => ({
  isGenerating: false,
  progress: 0,
  generationId: null,
  processedPlayers: new Set(),

  startGeneration: async (teamId: string, players: Player[], nationality: string) => {
    const currentState = get();
    
    if (currentState.isGenerating) {
      console.log('Generation already in progress');
      return;
    }

    const generationId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    set({ 
      isGenerating: true, 
      progress: 0, 
      generationId,
      processedPlayers: new Set()
    });

    const teamRef = doc(db, "teams", teamId);
    let processedCount = 0;
    const batchUpdates: { [playerId: string]: Partial<Player> } = {};

    try {
      const teamDoc = await getDoc(teamRef);
      if (!teamDoc.exists()) {
        throw new Error('Team document does not exist');
      }

      const imageStream = await generatePlayerImages(players, nationality);

      for await (const imageData of imageStream.players) {
        if (get().generationId !== generationId) {
          console.log('Generation stopped, breaking loop');
          break;
        }

        if (!imageData) continue;

        const player = players.find(p => p.name === imageData.name);
        if (!player || get().processedPlayers.has(player.id)) continue;

        try {
          // Convert base64 to blob
          const base64Data = imageData.image_base64.replace(/^data:image\/\w+;base64,/, '');
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'image/png' });
          
          // Upload to Firebase Storage with retry logic
          const imageRef = ref(storage, `players/${teamId}/${player.id}-${Date.now()}.png`);
          let imageUrl: string;
          
          try {
            await uploadBytes(imageRef, blob);
            imageUrl = await getDownloadURL(imageRef);
          } catch (uploadError) {
            console.error(`Upload failed for ${player.name}, retrying:`, uploadError);
            const retryRef = ref(storage, `players/${teamId}/${player.id}-retry-${Date.now()}.png`);
            await uploadBytes(retryRef, blob);
            imageUrl = await getDownloadURL(retryRef);
          }

          // Store update for batch processing
          batchUpdates[player.id] = {
            imageUrl: imageUrl,
            image_base64: imageData.image_base64
          };

          // Mark as processed
          set(state => ({
            ...state,
            processedPlayers: new Set([...state.processedPlayers, player.id])
          }));

          processedCount++;
          set(state => ({ 
            ...state, 
            progress: (processedCount / players.length) * 100 
          }));

          // Update immediately for each player to ensure no data loss
          await runTransaction(db, async (transaction) => {
            const teamDoc = await transaction.get(teamRef);
            if (!teamDoc.exists()) return;

            const teamData = teamDoc.data();
            const currentPlayers = teamData.players as Player[] || [];
            
            const updatedPlayers = currentPlayers.map((p: Player) => 
              p.id === player.id ? { ...p, ...batchUpdates[player.id] } : p
            );

            transaction.update(teamRef, { 
              players: updatedPlayers,
              lastImageUpdate: new Date().toISOString()
            });
          });

          // Clear the batch after successful update
          delete batchUpdates[player.id];

        } catch (error) {
          console.error(`Error processing player ${player.name}:`, error);
        }
      }

    } catch (error) {
      console.error("Error in background image generation:", error);
    } finally {
      if (get().generationId === generationId) {
        set({ 
          isGenerating: false, 
          progress: 0, 
          generationId: null,
          processedPlayers: new Set()
        });
      }
    }
  },

  stopGeneration: () => {
    set({ 
      isGenerating: false, 
      progress: 0, 
      generationId: null,
      processedPlayers: new Set()
    });
  },
}));

// Helper function to batch update players
async function updatePlayersInBatch(
  teamRef: DocumentReference,
  updates: { [playerId: string]: Partial<Player> }
): Promise<void> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      await runTransaction(db, async (transaction) => {
        const teamDoc = await transaction.get(teamRef);
        
        if (!teamDoc.exists()) {
          throw new Error('Team document does not exist');
        }

        const teamData = teamDoc.data();
        const currentPlayers = teamData.players as Player[] || [];
        
        const updatedPlayers = currentPlayers.map((player: Player) => {
          const update = updates[player.id];
          return update ? { ...player, ...update } : player;
        });

        transaction.update(teamRef, { 
          players: updatedPlayers,
          lastImageUpdate: new Date().toISOString()
        });
      });

      break;

    } catch (error) {
      retryCount++;
      console.error(`Batch update failed (attempt ${retryCount}):`, error);
      
      if (retryCount >= maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }
} 