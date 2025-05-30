// import { create } from "zustand";
// import { generatePlayerImages } from "@/api";
// import { Player } from "@/types/team";
// import { db, storage } from "@/firebaseConfig";
// import { doc, updateDoc, getDoc, runTransaction, DocumentReference } from "firebase/firestore";
// import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// type BackgroundImageState = {
//   isGenerating: boolean;
//   progress: number;
//   generationId: string | null;
//   processedPlayers: Set<string>;
//   playerImages: { [playerId: string]: string };
//   startGeneration: (teamId: string, players: Player[], nationality: string) => Promise<void>;
//   stopGeneration: () => void;
// };

// export const useBackgroundImageStore = create<BackgroundImageState>((set, get) => ({
//   isGenerating: false,
//   progress: 0,
//   generationId: null,
//   processedPlayers: new Set(),
//   playerImages: {},

//   startGeneration: async (teamId: string, players: Player[], nationality: string) => {
//     const currentState = get();
    
//     if (currentState.isGenerating) {
//       console.log('Generation already in progress');
//       return;
//     }

//     const generationId = `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
//     set({ 
//       isGenerating: true, 
//       progress: 0, 
//       generationId,
//       processedPlayers: new Set(),
//       playerImages: {}
//     });

//     const teamRef = doc(db, "teams", teamId);
//     let processedCount = 0;
//     const maxRetries = 3;

//     try {
//       const teamDoc = await getDoc(teamRef);
//       if (!teamDoc.exists()) {
//         throw new Error('Team document does not exist');
//       }

//       // Collect all images first
//       console.log('Starting to collect images from stream...');
//       const imageStream = await generatePlayerImages(players, nationality);
//       const processedImages = new Map<string, { image_base64: string; name: string }>();
      
//       for await (const imageData of imageStream.players) {
//         if (get().generationId !== generationId) break;
//         if (!imageData) continue;

//         const unprocessedPlayer = players.find(p => !processedImages.has(p.id));
//         if (!unprocessedPlayer) continue;

//         processedImages.set(unprocessedPlayer.id, imageData);
//         set(state => ({
//           ...state,
//           playerImages: {
//             ...state.playerImages,
//             [unprocessedPlayer.id]: imageData.image_base64
//           }
//         }));
//       }

//       console.log(`Collected ${processedImages.size} images from stream`);

//       // Process images in parallel batches
//       const batchSize = 3; // Process 3 images at a time
//       const batches = Array.from(processedImages.entries()).reduce((acc, curr, i) => {
//         const batchIndex = Math.floor(i / batchSize);
//         if (!acc[batchIndex]) acc[batchIndex] = [];
//         acc[batchIndex].push(curr);
//         return acc;
//       }, [] as [string, { image_base64: string; name: string }][][]);

//       for (const batch of batches) {
//         if (get().generationId !== generationId) break;

//         // Process batch in parallel
//         await Promise.all(batch.map(async ([playerId, imageData]) => {
//           const player = players.find(p => p.id === playerId);
//           if (!player) return;

//           let retryCount = 0;
//           let success = false;

//           while (retryCount < maxRetries && !success) {
//             try {
//               // Convert base64 to blob
//               const base64Data = imageData.image_base64.replace(/^data:image\/\w+;base64,/, '');
//               const binaryString = atob(base64Data);
//               const bytes = new Uint8Array(binaryString.length);
//               for (let i = 0; i < binaryString.length; i++) {
//                 bytes[i] = binaryString.charCodeAt(i);
//               }
//               const blob = new Blob([bytes], { type: 'image/png' });
              
//               // Upload to Firebase Storage
//               const imageRef = ref(storage, `players/${teamId}/${player.id}-${Date.now()}.png`);
//               await uploadBytes(imageRef, blob);
//               const imageUrl = await getDownloadURL(imageRef);

//               // Update Firestore
//               await runTransaction(db, async (transaction) => {
//                 const teamDoc = await transaction.get(teamRef);
//                 if (!teamDoc.exists()) return;

//                 const teamData = teamDoc.data();
//                 const currentPlayers = teamData.players as Player[] || [];
                
//                 const updatedPlayers = currentPlayers.map((p: Player) => 
//                   p.id === player.id ? { ...p, imageUrl } : p
//                 );

//                 transaction.update(teamRef, { 
//                   players: updatedPlayers,
//                   lastImageUpdate: new Date().toISOString()
//                 });
//               });

//               set(state => ({
//                 ...state,
//                 processedPlayers: new Set([...state.processedPlayers, player.id])
//               }));

//               processedCount++;
//               set(state => ({ 
//                 ...state, 
//                 progress: (processedCount / players.length) * 100 
//               }));

//               success = true;
//             } catch (error) {
//               console.error(`Error processing player ${player.name}:`, error);
//               retryCount++;
//               if (retryCount < maxRetries) {
//                 await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
//               }
//             }
//           }
//         }));
//       }

//     } catch (error) {
//       console.error("Error in background image generation:", error);
//     } finally {
//       if (get().generationId === generationId) {
//         set({ 
//           isGenerating: false, 
//           progress: 0, 
//           generationId: null,
//           processedPlayers: new Set(),
//           playerImages: {}
//         });
//       }
//     }
//   },

//   stopGeneration: () => {
//     set({ 
//       isGenerating: false, 
//       progress: 0, 
//       generationId: null,
//       processedPlayers: new Set(),
//       playerImages: {}
//     });
//   },
// }));

// // Helper function to batch update players
// async function updatePlayersInBatch(
//   teamRef: DocumentReference,
//   updates: { [playerId: string]: Partial<Player> }
// ): Promise<void> {
//   const maxRetries = 3;
//   let retryCount = 0;

//   while (retryCount < maxRetries) {
//     try {
//       await runTransaction(db, async (transaction) => {
//         const teamDoc = await transaction.get(teamRef);
        
//         if (!teamDoc.exists()) {
//           throw new Error('Team document does not exist');
//         }

//         const teamData = teamDoc.data();
//         const currentPlayers = teamData.players as Player[] || [];
        
//         const updatedPlayers = currentPlayers.map((player: Player) => {
//           const update = updates[player.id];
//           return update ? { ...player, ...update } : player;
//         });

//         transaction.update(teamRef, { 
//           players: updatedPlayers,
//           lastImageUpdate: new Date().toISOString()
//         });
//       });

//       break;

//     } catch (error) {
//       retryCount++;
//       console.error(`Batch update failed (attempt ${retryCount}):`, error);
      
//       if (retryCount >= maxRetries) {
//         throw error;
//       }
      
//       await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
//     }
//   }
// } 