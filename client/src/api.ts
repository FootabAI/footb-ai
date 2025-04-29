export const API_URL = 'http://127.0.0.1:8000';

export const create_club_logo = async (themes: string[], colors: string[]) => {
    const response = await fetch(`${API_URL}/create_club_logo`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            themes,
            colors
        }),
    });
    return response.json();
    
};