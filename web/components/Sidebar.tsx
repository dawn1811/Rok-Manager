import React from 'react';
import type { User, View } from '../types';

interface SidebarProps {
  currentUser: User | null;
  currentView: View;
  setView: (view: View) => void;
  onLogout: () => void;
}

const NavItem: React.FC<{
  label: string;
  icon: JSX.Element;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <li
    onClick={onClick}
    className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-all duration-200 ${
      isActive ? 'bg-highlight text-white shadow-lg' : 'hover:bg-accent text-text-secondary'
    }`}
  >
    {icon}
    <span className="ml-3 font-medium">{label}</span>
  </li>
);

const UserProfile: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
  <div className="absolute bottom-0 left-0 w-full p-4 border-t border-accent">
      <div className="flex items-center">
          <img src={`https://picsum.photos/seed/${user.governorId}/40/40`} alt="Avatar" className="w-10 h-10 rounded-full" />
          <div className="ml-3">
              <p className="font-bold text-text-primary text-sm">{user.governorId}</p>
              <p className="text-xs text-text-secondary">{user.role}</p>
          </div>
      </div>
       <button
        onClick={onLogout}
        className="w-full mt-4 flex items-center justify-center p-2 text-sm text-text-secondary rounded-lg hover:bg-red-500 hover:text-white transition-colors"
      >
        <LogoutIcon />
        <span className="ml-2">Logout</span>
      </button>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentUser, currentView, setView, onLogout }) => {
  if (!currentUser) return null;

  return (
    <aside className="w-64 bg-secondary text-text-primary flex flex-col p-4 relative h-screen">
        <div className="text-2xl font-bold mb-10 text-center text-text-primary">KD 3561 Manager</div>
        <nav>
            <ul>
                <NavItem 
                    label="Dashboard" 
                    icon={<DashboardIcon />} 
                    isActive={currentView === 'DASHBOARD'} 
                    onClick={() => setView('DASHBOARD')} 
                />
                <NavItem 
                    label="My Profile" 
                    icon={<ProfileIcon />} 
                    isActive={currentView === 'PROFILE'} 
                    onClick={() => setView('PROFILE')} 
                />
                <NavItem 
                    label="Events" 
                    icon={<EventsIcon />} 
                    isActive={currentView === 'EVENTS'} 
                    onClick={() => setView('EVENTS')} 
                />
            </ul>
        </nav>
        <UserProfile user={currentUser} onLogout={onLogout} />
    </aside>
  );
};


// SVG Icons
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const EventsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);