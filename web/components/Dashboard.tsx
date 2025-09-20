import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PlayerStat, StatsData } from '../types';
import { apiUploadStats } from '../services/apiService';

interface DashboardProps {
  allStats: StatsData;
  onStatsUploaded: () => void;
}

const DataUpload: React.FC<{ onUploadSuccess: () => void }> = ({ onUploadSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError('');
            setSuccessMessage('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file.");
            return;
        }
        setError('');
        setSuccessMessage('');
        setIsLoading(true);

        try {
            const kvkName = file.name.replace(/\.csv$/, '');
            await apiUploadStats(kvkName, file);
            setSuccessMessage(`Successfully uploaded stats for ${kvkName}`);
            onUploadSuccess(); // Trigger data refresh in parent
            setFile(null); // Reset file input if needed
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-secondary p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-text-primary">Upload KvK Statistics</h3>
            <p className="text-sm text-text-secondary mb-4">Upload a .csv file. The filename will be used as the KvK name (e.g., `KvK-SoC-1.csv`).</p>
            
            {error && <p className="bg-red-100 text-red-600 p-2 rounded-lg mb-4 text-center text-sm">{error}</p>}
            {successMessage && <p className="bg-green-500/20 text-green-300 p-2 rounded-lg mb-4 text-center text-sm">{successMessage}</p>}

            <div className="flex items-center space-x-2">
                <input type="file" accept=".csv" onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-highlight/20 file:text-highlight hover:file:bg-highlight/30" key={file ? file.name : 'file-input'} />
                <button onClick={handleUpload} disabled={isLoading || !file} className="bg-highlight text-white font-bold py-2 px-6 rounded-lg hover:bg-opacity-80 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'Uploading...' : 'Upload'}
                </button>
            </div>
        </div>
    );
};


export const Dashboard: React.FC<DashboardProps> = ({ allStats, onStatsUploaded }) => {
  const kvkNames = useMemo(() => Object.keys(allStats).sort().reverse(), [allStats]);
  const [selectedKvk, setSelectedKvk] = useState<string | null>(null);

  // Effect to initialize the selected KvK from localStorage or default to the latest.
  useEffect(() => {
    if (kvkNames.length > 0) {
      const storedKvk = localStorage.getItem('selectedKvk');
      // If the current selection in state is still valid, don't change it.
      if (selectedKvk && kvkNames.includes(selectedKvk)) {
        return;
      }
      // Otherwise, try to load from storage or default to the newest KvK.
      if (storedKvk && kvkNames.includes(storedKvk)) {
        setSelectedKvk(storedKvk);
      } else {
        setSelectedKvk(kvkNames[0]);
      }
    } else {
      setSelectedKvk(null);
    }
  }, [kvkNames]); // This effect runs when the list of available KvKs changes.

  // Effect to persist the selected KvK to localStorage whenever it changes.
  useEffect(() => {
    if (selectedKvk) {
      localStorage.setItem('selectedKvk', selectedKvk);
    }
  }, [selectedKvk]);

  const currentStats = useMemo(() => {
    if (!selectedKvk) return [];
    return allStats[selectedKvk] || [];
  }, [selectedKvk, allStats]);
  
  const top10ByKills = useMemo(() => 
    [...currentStats].sort((a, b) => b.kills - a.kills).slice(0, 10), 
    [currentStats]
  );
  
  const handleExportCSV = () => {
    if (!currentStats || currentStats.length === 0 || !selectedKvk) {
        alert("No data available to export.");
        return;
    }

    const headers = Object.keys(currentStats[0]);
    const csvContent = [
        headers.join(','), // Header row
        ...currentStats.map(row => 
            headers.map(header => {
                const value = row[header as keyof PlayerStat];
                // Handle values with commas by enclosing them in double quotes
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedKvk}-export.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2">
            <h1 className="text-4xl font-bold text-text-primary mb-2">Statistics Dashboard</h1>
            <p className="text-text-secondary">Visualize performance across KvKs.</p>
        </div>
        <div className="flex items-center justify-end">
          {kvkNames.length > 0 && (
            <select
              value={selectedKvk || ''}
              onChange={(e) => setSelectedKvk(e.target.value)}
              className="w-full bg-secondary border border-highlight p-3 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-highlight"
            >
              {kvkNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          )}
        </div>
      </div>

      <DataUpload onUploadSuccess={onStatsUploaded} />

      {currentStats.length > 0 && selectedKvk ? (
          <>
            <div className="mt-8 bg-secondary p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-text-primary mb-4">Top 10 Players by Kills ({selectedKvk})</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={top10ByKills} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#6B7280" />
                        <YAxis stroke="#6B7280" />
                        <Tooltip contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}/>
                        <Legend wrapperStyle={{ color: '#6B7280' }} />
                        <Bar dataKey="kills" fill="#F97316" name="Total Kills" />
                        <Bar dataKey="t5Kills" fill="#9CA3AF" name="T5 Kills" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-8 bg-secondary p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-text-primary">Full Player Stats ({selectedKvk})</h2>
                    <button onClick={handleExportCSV} className="bg-highlight text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-80 transition-all whitespace-nowrap">
                        Export as CSV
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-accent">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-text-secondary">Name</th>
                                <th className="p-3 text-sm font-semibold text-text-secondary">Kills</th>
                                <th className="p-3 text-sm font-semibold text-text-secondary">Deaths</th>
                                <th className="p-3 text-sm font-semibold text-text-secondary">DKP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentStats.map(player => (
                                <tr key={player.governorId} className="border-b border-accent hover:bg-accent/50">
                                    <td className="p-3 font-medium text-text-primary">{player.name}</td>
                                    <td className="p-3">{player.kills.toLocaleString()}</td>
                                    <td className="p-3 text-red-400">{player.deaths.toLocaleString()}</td>
                                    <td className="p-3 font-bold text-highlight">{player.dkp.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
      ) : (
        <div className="mt-8 bg-secondary p-12 rounded-xl text-center">
            <p className="text-text-secondary">No data to display. Please upload a statistics file.</p>
        </div>
      )}
    </div>
  );
};