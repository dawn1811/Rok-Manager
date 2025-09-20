import { Role, AooTeam } from '../types';
import type { User, GameEvent, StatsData, PlayerStat } from '../types';
import { db, storage } from './firebase';
import { collection, getDocs, addDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

// --- MOCK DATA and HELPERS (for when Firebase/backend is not configured) ---

// Fix: Define an internal type for the user object that includes the password hash for mock DB purposes.
type UserWithPassword = User & { passwordHash: string };

const MOCK_DB = {
    // Fix: Use the internal UserWithPassword type for the mock database.
    users: new Map<string, UserWithPassword>(),
    stats: {
        'Kvk-SoC-1': [
            { governorId: '1111', name: 'Alice', power: 150_000_000, kills: 12_500_000, deaths: 800_000, t5Kills: 8_000_000, dkp: 18000 },
            { governorId: '2222', name: 'Bob', power: 220_000_000, kills: 25_000_000, deaths: 1_200_000, t5Kills: 15_000_000, dkp: 32000 },
            { governorId: '3333', name: 'Charlie', power: 95_000_000, kills: 8_000_000, deaths: 600_000, t5Kills: 4_500_000, dkp: 11000 },
        ],
        'Kvk-SoC-2': [
            { governorId: '1111', name: 'Alice', power: 180_000_000, kills: 15_000_000, deaths: 900_000, t5Kills: 10_000_000, dkp: 22000 },
            { governorId: '2222', name: 'Bob', power: 250_000_000, kills: 30_000_000, deaths: 1_500_000, t5Kills: 18_000_000, dkp: 40000 },
            { governorId: '4444', name: 'David', power: 130_000_000, kills: 10_000_000, deaths: 750_000, t5Kills: 6_000_000, dkp: 15000 },
        ]
    } as StatsData,
    events: [
        { id: '1', title: 'Ark of Osiris', date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), description: 'Prepare for the Ark of Osiris! Sign up now.' },
        { id: '2', title: 'Kingdom vs Kingdom', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), description: 'The great war is upon us. All members must be ready to fight for the kingdom\'s glory!' },
    ] as GameEvent[],
};
// Add a default user for easy testing
// Fix: The enums Role and AooTeam can now be used as values due to the corrected import.
MOCK_DB.users.set('12345', { governorId: '12345', passwordHash: 'password', role: Role.RALLY, aooTeam: AooTeam.TEAM_1 });

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));


// --- Authentication (Uses mock implementation) ---

export const apiLogin = async (governorId: string, password: string): Promise<User> => {
    console.log("Using Mock API for login. Use Governor ID: 12345, Password: password");
    await delay(500);
    const user = MOCK_DB.users.get(governorId);
    if (user && user.passwordHash === password) {
        const { passwordHash, ...userWithoutPassword } = user;
        localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
        return userWithoutPassword;
    }
    throw new Error('Invalid Governor ID or password.');
};

export const apiRegister = async (userData: { governorId: string; role: Role; aooTeam: AooTeam; }, password: string): Promise<User> => {
    console.log("Using Mock API for register");
    await delay(500);
    if (MOCK_DB.users.has(userData.governorId)) {
        throw new Error('Governor ID already exists.');
    }
    // Fix: Use the UserWithPassword type for the new user object to be stored in the mock DB.
    const newUser: UserWithPassword = { ...userData, passwordHash: password };
    MOCK_DB.users.set(userData.governorId, newUser);
    const { passwordHash, ...userWithoutPassword } = newUser;
    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    return userWithoutPassword;
};

export const apiLogout = async (): Promise<void> => {
    console.log("Using Mock API for logout");
    await delay(200);
    localStorage.removeItem('currentUser');
};

export const apiCheckSession = async (): Promise<User> => {
    console.log("Using Mock API for session check");
    await delay(100);
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
        return JSON.parse(userJson);
    }
    throw new Error('No active session.');
};


// --- Statistics (Uses Firebase if configured, otherwise mock) ---

export const apiGetAllStats = async (): Promise<StatsData> => {
    if (!db) {
        console.log("Firebase not configured, using mock stats data.");
        await delay(500);
        return Promise.resolve(MOCK_DB.stats);
    }
    
    console.log("Fetching stats from Firebase...");
    const statsCollectionRef = collection(db, 'kvk_stats');
    const querySnapshot = await getDocs(statsCollectionRef);
    const allStats: StatsData = {};
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.playerStats && Array.isArray(data.playerStats)) {
             allStats[doc.id] = data.playerStats as PlayerStat[];
        }
    });
    return allStats;
};

export const apiUploadStats = async (kvkName: string, file: File): Promise<void> => {
    if (!storage) {
        console.log("Firebase not configured, mocking stats upload.");
        await delay(1000);
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                // A simple CSV parser assuming header and format: governorId,name,power,kills,deaths,t5Kills,dkp
                const rows = text.split('\n').slice(1);
                const newStats = rows.map(row => {
                    const [governorId, name, power, kills, deaths, t5Kills, dkp] = row.split(',');
                    return {
                        governorId,
                        name,
                        power: parseInt(power, 10) || 0,
                        kills: parseInt(kills, 10) || 0,
                        deaths: parseInt(deaths, 10) || 0,
                        t5Kills: parseInt(t5Kills, 10) || 0,
                        dkp: parseInt(dkp, 10) || 0,
                    };
                }).filter(s => s.governorId && s.name); // filter out empty/invalid rows
                
                if (newStats.length > 0) {
                    MOCK_DB.stats[kvkName] = newStats;
                    console.log(`Mock updated stats for ${kvkName} with ${newStats.length} players.`);
                } else {
                     console.log(`Could not parse any player stats from ${file.name}.`);
                }
                resolve();
            };
            reader.onerror = () => {
                console.error("Failed to read the uploaded file.");
                resolve(); // resolve anyway to not hang the UI
            };
            reader.readAsText(file);
        });
    }
    
    console.log(`Uploading stats for ${kvkName} to Firebase...`);
    const storageRef = ref(storage, `uploads/${kvkName}.csv`);
    await uploadBytes(storageRef, file);
};


// --- Events (Uses Firebase if configured, otherwise mock) ---

export const apiGetEvents = async (): Promise<GameEvent[]> => {
    if (!db) {
        console.log("Firebase not configured, using mock events data.");
        await delay(300);
        return Promise.resolve(MOCK_DB.events);
    }
    
    console.log("Fetching events from Firebase...");
    const eventsCollectionRef = collection(db, 'events');
    const querySnapshot = await getDocs(eventsCollectionRef);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as GameEvent));
};

export const apiCreateEvent = async (eventData: Omit<GameEvent, 'id'>): Promise<GameEvent> => {
    if (!db) {
        console.log("Firebase not configured, mocking event creation.");
        await delay(500);
        const newEvent: GameEvent = {
            id: String(Date.now()), // simple unique ID for mock
            ...eventData
        };
        MOCK_DB.events.push(newEvent);
        return newEvent;
    }
    
    console.log("Creating event in Firebase...");
    const eventsCollectionRef = collection(db, 'events');
    const docRef = await addDoc(eventsCollectionRef, eventData);
    return {
        id: docRef.id,
        ...eventData,
    };
};