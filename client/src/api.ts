import { Match, Team } from "./types";

export const API_URL = "http://127.0.0.1:8000";

export const create_club_logo = async (themes: string[], colors: string[]) => {
  const response = await fetch(`${API_URL}/create_club_logo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      themes,
      colors,
    }),
  });
  console.log(response);
  return response.json();
};

export const simulate_match = async (user_team: Team, opponent_team: Team) => {
  const response = await fetch(`${API_URL}/simulate_match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_team,
      opponent_team,
    }),
  });
  console.log(response);
  return response.json();
};
