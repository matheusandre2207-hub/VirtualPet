window.GameDB = {
    save: (username, data) => {
        try {
            localStorage.setItem(`game_acc_${username}`, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error("Database Save Error:", e);
            return false;
        }
    },
    load: (username) => {
        const data = localStorage.getItem(`game_acc_${username}`);
        return data ? JSON.parse(data) : null;
    }
};