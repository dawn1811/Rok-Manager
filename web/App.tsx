import React, { useState, useEffect, useCallback } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Profile } from './components/Profile';
import { Events } from './components/Events';
import { Sidebar } from './components/Sidebar';
import type { User, View, GameEvent, StatsData, PlayerStat } from './types';
import * as api from './services/apiService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('DASHBOARD');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allStats, setAllStats] = useState<StatsData>({});
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    try {
      const [stats, eventsData] = await Promise.all([
        api.apiGetAllStats(),
        api.apiGetEvents(),
      ]);
      setAllStats(stats);
      setEvents(eventsData);
    } catch (error) {
      console.error("Failed to fetch initial data:", error);
      // Optionally set an error state to show in the UI
    }
  }, []);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const user = await api.apiCheckSession();
        setCurrentUser(user);
        await fetchAllData();
      } catch (error) {
        console.log("No active session found.");
      } finally {
        setIsLoading(false);
      }
    };
    checkUserSession();
  }, [fetchAllData]);
  
  const handleRegister = async (newUser: Omit<User, 'passwordHash'>, password: string): Promise<boolean> => {
    try {
      const user = await api.apiRegister(newUser, password);
      setCurrentUser(user);
      await fetchAllData();
      setView('DASHBOARD');
      return true;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error; // Re-throw to be caught by the Login component
    }
  };

  const handleLogin = async (governorId: string, password: string): Promise<boolean> => {
    try {
      const user = await api.apiLogin(governorId, password);
      setCurrentUser(user);
      await fetchAllData();
      setView('DASHBOARD');
      return true;
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Re-throw to be caught by the Login component
    }
  };
  
  const handleLogout = async () => {
      try {
          await api.apiLogout();
          setCurrentUser(null);
          setAllStats({});
          setEvents([]);
      } catch (error) {
          console.error("Logout failed:", error);
      }
  };
  
  const addEvent = async (event: Omit<GameEvent, 'id'>) => {
    await api.apiCreateEvent(event);
    // Refetch events to get the latest list
    const updatedEvents = await api.apiGetEvents();
    setEvents(updatedEvents);
  };
  
  const handleStatsUploaded = async () => {
      // Refetch stats after upload
      const updatedStats = await api.apiGetAllStats();
      setAllStats(updatedStats);
  };

  const renderView = () => {
    switch (view) {
      case 'DASHBOARD':
        return <Dashboard allStats={allStats} onStatsUploaded={handleStatsUploaded}/>;
      case 'PROFILE':
        return currentUser ? <Profile currentUser={currentUser} allStats={allStats} /> : null;
      case 'EVENTS':
        return <Events events={events} addEvent={addEvent} />;
      default:
        return <Dashboard allStats={allStats} onStatsUploaded={handleStatsUploaded}/>;
    }
  };
  
  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-primary">
            <p className="text-text-primary text-xl">Loading Manager...</p>
        </div>
    )
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar currentUser={currentUser} currentView={view} setView={setView} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto bg-primary">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
