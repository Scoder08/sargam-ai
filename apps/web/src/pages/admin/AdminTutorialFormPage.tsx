import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useAdminTutorial,
  useCreateTutorialMutation,
  useUpdateTutorialMutation,
  useParseTutorialMutation,
} from '@sargam/api';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];
const GENRES = ['bollywood', 'classical', 'pop', 'rock', 'devotional', 'ghazal', 'folk'];

export default function AdminTutorialFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existingTutorial, isLoading: loadingTutorial } = useAdminTutorial(
    parseInt(id || '0'),
    { enabled: isEdit }
  );

  const createMutation = useCreateTutorialMutation();
  const updateMutation = useUpdateTutorialMutation();
  const parseMutation = useParseTutorialMutation();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    titleHindi: '',
    artist: '',
    movie: '',
    year: '',
    tempo: '120',
    key: 'C',
    duration: '180',
    genre: 'bollywood',
    difficulty: 'beginner',
    instruments: 'piano',
    thumbnailUrl: '',
    previewUrl: '',
    isPopular: false,
    isFree: false,
  });

  // Melody input
  const [inputMode, setInputMode] = useState<'raw' | 'midi'>('raw');
  const [rawInput, setRawInput] = useState('');
  const [midiNotes, setMidiNotes] = useState('');
  const [parsedPreview, setParsedPreview] = useState<any>(null);
  const [parseError, setParseError] = useState('');

  // Load existing data
  useEffect(() => {
    if (existingTutorial) {
      setFormData({
        title: existingTutorial.title || '',
        titleHindi: existingTutorial.titleHindi || '',
        artist: existingTutorial.artist || '',
        movie: existingTutorial.movie || '',
        year: existingTutorial.year?.toString() || '',
        tempo: existingTutorial.tempo?.toString() || '120',
        key: existingTutorial.key || 'C',
        duration: existingTutorial.duration?.toString() || '180',
        genre: existingTutorial.genre || 'bollywood',
        difficulty: existingTutorial.difficulty || 'beginner',
        instruments: existingTutorial.instruments || 'piano',
        thumbnailUrl: existingTutorial.thumbnailUrl || '',
        previewUrl: existingTutorial.previewUrl || '',
        isPopular: existingTutorial.isPopular || false,
        isFree: existingTutorial.isFree || false,
      });

      if (existingTutorial.melodyPattern?.notes) {
        setMidiNotes(existingTutorial.melodyPattern.notes.join(', '));
        setInputMode('midi');
      }
    }
  }, [existingTutorial]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleParse = async () => {
    if (!rawInput.trim()) return;

    setParseError('');
    setParsedPreview(null);

    try {
      const result = await parseMutation.mutateAsync({
        rawInput,
        title: formData.title,
        artist: formData.artist,
      });
      setParsedPreview(result.parsed);
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse input');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare notes
    let notes: number[] = [];
    let intervals: number[] = [];

    if (inputMode === 'midi' && midiNotes) {
      notes = midiNotes.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
      for (let i = 1; i < notes.length; i++) {
        intervals.push(notes[i] - notes[i-1]);
      }
    } else if (parsedPreview) {
      notes = parsedPreview.notes || [];
      intervals = parsedPreview.intervals || [];
    }

    const payload = {
      ...formData,
      year: formData.year ? parseInt(formData.year) : undefined,
      tempo: parseInt(formData.tempo),
      duration: parseInt(formData.duration),
      notes,
      intervals,
      rawInput: inputMode === 'raw' ? rawInput : undefined,
      useAI: inputMode === 'raw' && rawInput && !parsedPreview,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: parseInt(id!), data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      navigate('/admin/tutorials');
    } catch (err: any) {
      alert(err.message || 'Failed to save tutorial');
    }
  };

  if (isEdit && loadingTutorial) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/tutorials')}
          className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
        >
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </button>
        <h1 className="text-2xl font-bold text-white">
          {isEdit ? 'Edit Tutorial' : 'New Tutorial'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <section className="bg-[#111] rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Tum Hi Ho"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Title (Hindi)</label>
              <input
                type="text"
                name="titleHindi"
                value={formData.titleHindi}
                onChange={handleChange}
                placeholder="e.g., तुम ही हो"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Artist *</label>
              <input
                type="text"
                name="artist"
                value={formData.artist}
                onChange={handleChange}
                required
                placeholder="e.g., Arijit Singh"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Movie</label>
              <input
                type="text"
                name="movie"
                value={formData.movie}
                onChange={handleChange}
                placeholder="e.g., Aashiqui 2"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Year</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                placeholder="e.g., 2013"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Genre</label>
              <select
                name="genre"
                value={formData.genre}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
              >
                {GENRES.map(g => (
                  <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Music Details */}
        <section className="bg-[#111] rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Music Details</h2>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">Tempo (BPM)</label>
              <input
                type="number"
                name="tempo"
                value={formData.tempo}
                onChange={handleChange}
                min="40"
                max="240"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Key</label>
              <select
                name="key"
                value={formData.key}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
              >
                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Am', 'Em', 'Dm', 'Gm'].map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Duration (sec)</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                min="30"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-2">Difficulty</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
              >
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-6 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isFree"
                checked={formData.isFree}
                onChange={handleChange}
                className="w-5 h-5 rounded bg-white/5 border-white/20 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-white">Free</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isPopular"
                checked={formData.isPopular}
                onChange={handleChange}
                className="w-5 h-5 rounded bg-white/5 border-white/20 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-white">Popular</span>
            </label>
          </div>
        </section>

        {/* Melody Input */}
        <section className="bg-[#111] rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MusicNoteRoundedIcon sx={{ fontSize: 20 }} />
            Melody Notes
          </h2>

          {/* Input Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setInputMode('raw')}
              className={`px-4 py-2 rounded-lg transition-all ${
                inputMode === 'raw'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} className="mr-2" />
              Flexible Input (AI Parse)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('midi')}
              className={`px-4 py-2 rounded-lg transition-all ${
                inputMode === 'midi'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              MIDI Notes (Direct)
            </button>
          </div>

          {inputMode === 'raw' ? (
            <div>
              <p className="text-white/40 text-sm mb-3">
                Enter notes in any format - Sargam (Sa Re Ga), Western (C D E), numbered (1 2 3), or describe the melody.
                AI will parse it automatically.
              </p>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Examples:
• Sa Re Ga Ma Pa Dha Ni Sa'
• C4 D4 E4 F4 G4 A4 B4 C5
• 1 2 3 4 5 6 7 1'
• G A B A G E G A B A G E D E G G (Pehle Bhi Main hook)"
                rows={6}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 font-mono"
              />
              <button
                type="button"
                onClick={handleParse}
                disabled={parseMutation.isPending || !rawInput.trim()}
                className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
                {parseMutation.isPending ? 'Parsing...' : 'Parse with AI'}
              </button>

              {parseError && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {parseError}
                </div>
              )}

              {parsedPreview && (
                <div className="mt-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-emerald-400 font-medium mb-2">Parsed Successfully!</p>
                  <p className="text-white/60 text-sm">
                    <strong>Notes:</strong> {parsedPreview.notes?.join(', ')}
                  </p>
                  <p className="text-white/60 text-sm">
                    <strong>Intervals:</strong> {parsedPreview.intervals?.join(', ')}
                  </p>
                  <p className="text-white/60 text-sm">
                    <strong>Detected Key:</strong> {parsedPreview.key}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-white/40 text-sm mb-3">
                Enter MIDI note numbers directly (Middle C = 60). Separate with commas.
              </p>
              <textarea
                value={midiNotes}
                onChange={(e) => setMidiNotes(e.target.value)}
                placeholder="60, 62, 64, 65, 67, 69, 71, 72"
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50 font-mono"
              />
              <p className="text-white/40 text-xs mt-2">
                Reference: C4=60, D4=62, E4=64, F4=65, G4=67, A4=69, B4=71, C5=72
              </p>
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/tutorials')}
            className="px-6 py-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'Saving...'
              : isEdit
                ? 'Update Tutorial'
                : 'Create Tutorial'}
          </button>
        </div>
      </form>
    </div>
  );
}
