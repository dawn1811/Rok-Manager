import React from 'react';
import type { User, StatsData } from '../types';

interface ProfileProps {
  currentUser: User;
  allStats: StatsData;
}

const StatCard: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="bg-secondary p-6 rounded-xl shadow-lg">
        <p className="text-sm text-text-secondary font-medium">{label}</p>
        <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
    </div>
);

export const Profile: React.FC<ProfileProps> = ({ currentUser, allStats }) => {
  const kvkNames = Object.keys(allStats).sort().reverse();
  const latestKvk = kvkNames.length > 0 ? kvkNames[0] : null;
  const userStats = latestKvk ? allStats[latestKvk].find(p => p.governorId === currentUser.governorId) : null;
  
  return (
    <div className="p-8">
      <div className="flex items-center space-x-6 mb-10">
        <img 
          src={`https://picsum.photos/seed/${currentUser.governorId}/128/128`} 
          alt="Profile Avatar" 
          className="w-32 h-32 rounded-full border-4 border-highlight shadow-lg"
        />
        <div>
          <h1 className="text-4xl font-bold text-text-primary">{currentUser.governorId}</h1>
          <p className="text-text-secondary text-lg mt-1">Kingdom Member</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Primary Role" value={currentUser.role} />
          <StatCard label="AOO Team" value={currentUser.aooTeam} />
          <StatCard 
            label={`DKP (${latestKvk || 'N/A'})`} 
            value={userStats ? userStats.dkp.toLocaleString() : 'N/A'}
          />
      </div>

      <div className="mt-12 bg-secondary p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold text-text-primary mb-4">Statistics Overview</h2>
        {kvkNames.length > 0 ? (
           <div className="space-y-4">
             {kvkNames.map(kvkName => {
               const stats = allStats[kvkName].find(p => p.governorId === currentUser.governorId);
               return (
                 <div key={kvkName} className="p-4 bg-accent rounded-lg flex justify-between items-center">
                   <h3 className="font-bold text-lg">{kvkName}</h3>
                   {stats ? (
                      <div className="flex space-x-6 text-right">
                        <div>
                          <p className="text-xs text-text-secondary">Kills</p>
                          <p className="font-semibold">{stats.kills.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Deaths</p>
                          <p className="font-semibold">{stats.deaths.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">DKP</p>
                          <p className="font-semibold text-highlight">{stats.dkp.toLocaleString()}</p>
                        </div>
                      </div>
                   ) : (
                     <p className="text-text-secondary">No data for this KvK</p>
                   )}
                 </div>
               );
             })}
           </div>
        ) : (
            <p className="text-text-secondary text-center py-8">No statistics have been uploaded yet.</p>
        )}
      </div>
    </div>
  );
};