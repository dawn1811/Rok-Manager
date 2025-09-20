import React, { useState } from 'react';
import { generateEventDescription } from '../services/geminiService';
import type { GameEvent } from '../types';

interface EventsProps {
  events: GameEvent[];
  addEvent: (event: Omit<GameEvent, 'id'>) => Promise<void>;
}

export const Events: React.FC<EventsProps> = ({ events, addEvent }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateDescription = async () => {
    if (!title) {
      setError("Please enter an event title first.");
      return;
    }
    setError('');
    setIsGenerating(true);
    const generatedDesc = await generateEventDescription(title);
    setDescription(generatedDesc);
    setIsGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !description) {
        setError("Please fill all fields.");
        return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await addEvent({ title, date, description });
      setTitle('');
      setDate('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <div className="bg-secondary p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-text-primary mb-6">Schedule New Event</h2>
          {error && <p className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-center">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Event Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-accent border border-highlight p-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-highlight"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Date & Time</label>
              <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-accent border border-highlight p-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-highlight"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full bg-accent border border-highlight p-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-highlight"/>
              <button type="button" onClick={handleGenerateDescription} disabled={isGenerating || isSubmitting} className="mt-2 w-full flex justify-center items-center text-sm bg-highlight/50 hover:bg-highlight/80 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
                {isGenerating ? (
                   <>
                    <SpinnerIcon /> Generating with AI...
                   </>
                ) : 'Generate with AI'}
              </button>
            </div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-highlight text-white font-bold py-3 px-4 rounded-lg hover:bg-opacity-80 transition-all disabled:opacity-50 disabled:cursor-wait">
              {isSubmitting ? 'Scheduling...' : 'Schedule Event'}
            </button>
          </form>
        </div>
      </div>
      <div className="lg:col-span-2">
        <h2 className="text-3xl font-bold text-text-primary mb-6">Upcoming Events</h2>
        <div className="space-y-4">
          {events.length > 0 ? (
            events.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
              <div key={event.id} className="bg-secondary p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary">{event.title}</h3>
                    <p className="text-sm text-highlight font-semibold">{new Date(event.date).toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-text-secondary mt-3 whitespace-pre-wrap">{event.description}</p>
              </div>
            ))
          ) : (
            <div className="bg-secondary p-10 rounded-xl shadow-lg text-center">
                <p className="text-text-secondary">No events scheduled yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);