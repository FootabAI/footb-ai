import { Player } from './team';

export interface PlayerGenerationResponse {
  success: boolean;
  players: Player[];
  error?: string;
} 