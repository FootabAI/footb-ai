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
  playerImages: { [playerId: string]: string };
  startGeneration: (teamId: string, players: Player[], nationality: string) => Promise<void>;
  stopGeneration: () => void;
};

export const useBackgroundImageStore = create<BackgroundImageState>((set, get) => ({
  isGenerating: false,
  progress: 0,
  generationId: null,
  processedPlayers: new Set(),
  playerImages: {},

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
      processedPlayers: new Set(),
      playerImages: {}
    });

    const teamRef = doc(db, "teams", teamId);
    let processedCount = 0;
    const maxRetries = 3;

    try {
      const teamDoc = await getDoc(teamRef);
      if (!teamDoc.exists()) {
        throw new Error('Team document does not exist');
      }

      const imageStream = await generatePlayerImages(players, nationality);
      const processedImages = new Map<string, { image_base64: string; name: string }>();
      const processedPlayerIds = new Set<string>();

      // First, collect all images
      console.log('Starting to collect images from stream...');
      for await (const imageData of imageStream.players) {
        if (get().generationId !== generationId) {
          console.log('Generation stopped, breaking loop');
          break;
        }

        if (!imageData) {
          console.log('Received null image data, skipping...');
          continue;
        }

        // Find the first unprocessed player
        const unprocessedPlayer = players.find(p => !processedPlayerIds.has(p.id));
        if (!unprocessedPlayer) {
          console.log('No unprocessed players found');
          continue;
        }

        console.log(`Collected image for player: ${unprocessedPlayer.name} (ID: ${unprocessedPlayer.id})`);
        processedImages.set(unprocessedPlayer.id, imageData);
        processedPlayerIds.add(unprocessedPlayer.id);

        // If we've collected all images, break the loop
        if (processedImages.size === players.length) {
          console.log('Collected all player images, stopping stream');
          break;
        }
      }

      console.log(`Collected ${processedImages.size} images from stream`);

      // Then process each image with retries
      for (const [playerId, imageData] of processedImages) {
        if (get().generationId !== generationId) break;

        const player = players.find(p => p.id === playerId);
        if (!player) {
          console.log(`No player found for ID: ${playerId}`);
          continue;
        }

        let retryCount = 0;
        let success = false;

        while (retryCount < maxRetries && !success) {
          try {
            console.log(`Processing image for ${player.name} (ID: ${player.id}, attempt ${retryCount + 1})`);
            
            // Convert base64 to blob
            const base64Data = imageData.image_base64.replace(/^data:image\/\w+;base64,/, '');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'image/png' });
            
            // Upload to Firebase Storage
            const imageRef = ref(storage, `players/${teamId}/${player.id}-${Date.now()}.png`);
            console.log(`Uploading image for ${player.name} (ID: ${player.id}) to Firebase Storage...`);
            await uploadBytes(imageRef, blob);
            const imageUrl = await getDownloadURL(imageRef);
            console.log(`Successfully uploaded image for ${player.name} (ID: ${player.id}), URL: ${imageUrl}`);

            // Update Firestore
            console.log(`Updating Firestore for ${player.name} (ID: ${player.id})...`);
            await runTransaction(db, async (transaction) => {
              const teamDoc = await transaction.get(teamRef);
              if (!teamDoc.exists()) {
                console.log('Team document does not exist during update');
                return;
              }

              const teamData = teamDoc.data();
              const currentPlayers = teamData.players as Player[] || [];
              
              const updatedPlayers = currentPlayers.map((p: Player) => 
                p.id === player.id ? { 
                  ...p, 
                  imageUrl: imageUrl
                } : p
              );

              transaction.update(teamRef, { 
                players: updatedPlayers,
                lastImageUpdate: new Date().toISOString()
              });
            });
            console.log(`Successfully updated Firestore for ${player.name} (ID: ${player.id})`);

            // Store base64 data in memory for immediate display
            set(state => ({
              ...state,
              processedPlayers: new Set([...state.processedPlayers, player.id]),
              playerImages: {
                ...state.playerImages,
                [player.id]: imageData.image_base64
              }
            }));

            processedCount++;
            set(state => ({ 
              ...state, 
              progress: (processedCount / players.length) * 100 
            }));

            success = true;
            console.log(`Successfully processed ${player.name} (ID: ${player.id})`);
          } catch (error) {
            console.error(`Error processing player ${player.name} (ID: ${player.id}, attempt ${retryCount + 1}):`, error);
            retryCount++;
            if (retryCount < maxRetries) {
              const delay = Math.pow(2, retryCount) * 1000;
              console.log(`Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }

        if (!success) {
          console.error(`Failed to process player ${player.name} (ID: ${player.id}) after ${maxRetries} attempts`);
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
          processedPlayers: new Set(),
          playerImages: {}
        });
      }
    }
  },

  stopGeneration: () => {
    set({ 
      isGenerating: false, 
      progress: 0, 
      generationId: null,
      processedPlayers: new Set(),
      playerImages: {}
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