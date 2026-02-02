import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateSongFromAudioMutation, useAnalyzeAudioMutation } from '@sargam/api';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

type Step = 'upload' | 'analyzing' | 'preview' | 'details' | 'creating' | 'done';

interface AnalysisResult {
  tempo: number;
  key: string;
  duration: number;
  noteCount: number;
  notes: any[];
}

export default function CreateSongPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [movie, setMovie] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');

  const analyzeMutation = useAnalyzeAudioMutation();
  const createMutation = useCreateSongFromAudioMutation();

  const handleFileSelect = useCallback(async (file: File) => {
    setAudioFile(file);
    setError(null);
    setStep('analyzing');

    try {
      const result = await analyzeMutation.mutateAsync(file);
      setAnalysisResult({
        tempo: result.tempo,
        key: result.key,
        duration: result.duration,
        noteCount: result.noteCount,
        notes: result.notes
      });
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to analyze audio');
      setStep('upload');
    }
  }, [analyzeMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      handleFileSelect(file);
    } else {
      setError('Please drop an audio file (MP3, WAV, etc.)');
    }
  }, [handleFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCreateSong = async () => {
    if (!audioFile || !title || !artist) return;

    setStep('creating');
    setError(null);

    try {
      const result = await createMutation.mutateAsync({
        audioFile,
        metadata: { title, artist, movie, difficulty }
      });

      if (result.success) {
        setStep('done');
        // Navigate to the new song after a brief delay
        setTimeout(() => {
          navigate(`/practice/${result.song.id}`);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create song');
      setStep('details');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a] border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 20, color: 'white' }} />
          </button>
          <h1 className="text-lg font-bold text-white">Create Tutorial</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AutoAwesomeRoundedIcon sx={{ fontSize: 32, color: 'white' }} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Upload a Song</h2>
              <p className="text-white/60">
                Upload any Bollywood song and we'll automatically create a piano tutorial for you
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-orange-500/50 hover:bg-orange-500/5 transition-all cursor-pointer"
            >
              <CloudUploadRoundedIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.4)' }} />
              <p className="text-white/60 mt-4 mb-2">
                Drag & drop your audio file here
              </p>
              <p className="text-white/40 text-sm">
                or click to browse
              </p>
              <p className="text-white/30 text-xs mt-4">
                Supports MP3, WAV, M4A, OGG, FLAC
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileInput}
              className="hidden"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step: Analyzing */}
        {step === 'analyzing' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <div className="absolute inset-2 border-4 border-pink-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }} />
              <MusicNoteRoundedIcon
                sx={{ fontSize: 32, color: 'white' }}
                className="absolute inset-0 m-auto"
              />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Analyzing Audio...</h2>
            <p className="text-white/60">
              Extracting melody and detecting tempo
            </p>
            {audioFile && (
              <p className="text-white/40 text-sm mt-4">
                {audioFile.name}
              </p>
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && analysisResult && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckRoundedIcon sx={{ fontSize: 48, color: '#22c55e' }} />
              <h2 className="text-xl font-bold text-white mt-2">Analysis Complete!</h2>
            </div>

            {/* Analysis Results */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-white font-medium mb-4">Extracted Data</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-sm">Tempo</p>
                  <p className="text-white font-bold text-lg">{analysisResult.tempo} BPM</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Key</p>
                  <p className="text-white font-bold text-lg">{analysisResult.key}</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Duration</p>
                  <p className="text-white font-bold text-lg">{Math.round(analysisResult.duration)}s</p>
                </div>
                <div>
                  <p className="text-white/40 text-sm">Notes Found</p>
                  <p className="text-white font-bold text-lg">{analysisResult.noteCount}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('details')}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl text-white font-bold hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step: Details */}
        {step === 'details' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Song Details</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">Song Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Tum Hi Ho"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Artist *</label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="e.g., Arijit Singh"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Movie (Optional)</label>
                <input
                  type="text"
                  value={movie}
                  onChange={(e) => setMovie(e.target.value)}
                  placeholder="e.g., Aashiqui 2"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-2">Difficulty</label>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                        difficulty === level
                          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleCreateSong}
              disabled={!title || !artist}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Tutorial
            </button>
          </div>
        )}

        {/* Step: Creating */}
        {step === 'creating' && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-6">
              <div className="w-full h-full border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Creating Tutorial...</h2>
            <p className="text-white/60">
              This may take a moment
            </p>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckRoundedIcon sx={{ fontSize: 40, color: 'white' }} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Tutorial Created!</h2>
            <p className="text-white/60 mb-4">
              Redirecting to your new song...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
