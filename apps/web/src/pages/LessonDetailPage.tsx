import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Piano from '../components/Piano/Piano';
import RewardModal from '../components/RewardModal';
import { useLesson } from '@sargam/api';
import { midiToNoteName } from '../hooks/useAudio';

type FeedbackType = 'correct' | 'wrong' | 'early' | 'late' | null;

interface NoteData {
  midiNote: number;
  startTime: number;
  label: string;
}

interface SectionData {
  id: string;
  title: string;
  type: 'theory' | 'practice' | 'exercise' | 'video';
  order: number;
  content?: string;
  notes?: NoteData[];
}

// Default lesson content for practice sections that don't have notes from backend
const defaultPracticeNotes: Record<string, NoteData[]> = {
  'Finding Middle C': [
    { midiNote: 60, startTime: 0, label: 'C4' },
    { midiNote: 60, startTime: 1000, label: 'C4' },
    { midiNote: 60, startTime: 2000, label: 'C4' },
  ],
  'Your First Notes': [
    { midiNote: 60, startTime: 0, label: 'C4' },
    { midiNote: 62, startTime: 800, label: 'D4' },
    { midiNote: 64, startTime: 1600, label: 'E4' },
    { midiNote: 60, startTime: 2400, label: 'C4' },
  ],
  'Practice Exercise': [
    { midiNote: 60, startTime: 0, label: 'C4' },
    { midiNote: 62, startTime: 600, label: 'D4' },
    { midiNote: 64, startTime: 1200, label: 'E4' },
    { midiNote: 65, startTime: 1800, label: 'F4' },
    { midiNote: 67, startTime: 2400, label: 'G4' },
  ],
  'Right Hand Practice': [
    { midiNote: 60, startTime: 0, label: 'C4' },
    { midiNote: 62, startTime: 500, label: 'D4' },
    { midiNote: 64, startTime: 1000, label: 'E4' },
    { midiNote: 65, startTime: 1500, label: 'F4' },
    { midiNote: 67, startTime: 2000, label: 'G4' },
    { midiNote: 69, startTime: 2500, label: 'A4' },
    { midiNote: 71, startTime: 3000, label: 'B4' },
    { midiNote: 72, startTime: 3500, label: 'C5' },
  ],
  'Left Hand Practice': [
    { midiNote: 48, startTime: 0, label: 'C3' },
    { midiNote: 50, startTime: 500, label: 'D3' },
    { midiNote: 52, startTime: 1000, label: 'E3' },
    { midiNote: 53, startTime: 1500, label: 'F3' },
    { midiNote: 55, startTime: 2000, label: 'G3' },
    { midiNote: 57, startTime: 2500, label: 'A3' },
    { midiNote: 59, startTime: 3000, label: 'B3' },
    { midiNote: 60, startTime: 3500, label: 'C4' },
  ],
  'Both Hands Together': [
    { midiNote: 60, startTime: 0, label: 'C4' },
    { midiNote: 64, startTime: 500, label: 'E4' },
    { midiNote: 67, startTime: 1000, label: 'G4' },
    { midiNote: 72, startTime: 1500, label: 'C5' },
  ],
};

// Default theory content
const defaultTheoryContent: Record<string, string> = {
  'The Keyboard Layout': 'The piano has 88 keys - white and black. The white keys are natural notes (C, D, E, F, G, A, B), and black keys are sharps/flats.',
  'Hand Position': 'Keep your fingers curved like holding a ball. Your wrists should be level with your forearms.',
  'Finger Numbers': 'Thumb = 1, Index = 2, Middle = 3, Ring = 4, Pinky = 5. Same for both hands.',
  'Scale Basics': 'A scale is a sequence of notes in order. C Major scale uses only white keys: C-D-E-F-G-A-B-C',
};

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lessonId = id || '1';

  // Fetch lesson from backend
  const { data: lesson, isLoading, error } = useLesson(lessonId);

  // State
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [sectionComplete, setSectionComplete] = useState(false);
  const [showReward, setShowReward] = useState(false);

  // Refs
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading lesson...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">📚</span>
          <h1 className="text-2xl font-bold text-white mb-2">Lesson Not Found</h1>
          <p className="text-white/50 mb-6">This lesson might not be available yet.</p>
          <button
            onClick={() => navigate('/lessons')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-bold"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    );
  }

  // Transform sections from backend to our format
  const sections: SectionData[] = (lesson.sections || []).map((s: { id: string; title: string; type: string; order: number }) => {
    const section: SectionData = {
      id: s.id,
      title: s.title,
      type: s.type as SectionData['type'],
      order: s.order,
    };

    // Add content for theory sections
    if (s.type === 'theory') {
      section.content = defaultTheoryContent[s.title] || `Learn about ${s.title.toLowerCase()}.`;
    }

    // Add notes for practice/exercise sections
    if (s.type === 'practice' || s.type === 'exercise') {
      section.notes = defaultPracticeNotes[s.title] || [
        { midiNote: 60, startTime: 0, label: 'C4' },
        { midiNote: 62, startTime: 600, label: 'D4' },
        { midiNote: 64, startTime: 1200, label: 'E4' },
      ];
    }

    return section;
  });

  // If no sections, show empty state
  if (sections.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">📚</span>
          <h1 className="text-2xl font-bold text-white mb-2">{lesson.title}</h1>
          <p className="text-white/50 mb-6">Lesson content coming soon!</p>
          <button
            onClick={() => navigate('/lessons')}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white font-bold"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    );
  }

  const currentSection = sections[currentSectionIndex];
  const currentNote = currentSection.notes?.[currentNoteIndex];
  const totalNotes = currentSection.notes?.length || 0;
  const accuracy = score.correct + score.wrong > 0
    ? Math.round((score.correct / (score.correct + score.wrong)) * 100)
    : 100;

  const startPractice = () => {
    if (totalNotes === 0) return;

    setIsPlaying(true);
    setCurrentNoteIndex(0);
    setElapsedTime(0);
    setScore({ correct: 0, wrong: 0 });
    setSectionComplete(false);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current);
    }, 50);
  };

  const stopPractice = () => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleNotePlay = (midiNote: number) => {
    if (!isPlaying || !currentNote) return;

    const timeDiff = elapsedTime - currentNote.startTime;
    const isCorrectNote = midiNote === currentNote.midiNote;
    const isOnTime = Math.abs(timeDiff) < 300;

    let newFeedback: FeedbackType = null;

    if (isCorrectNote && isOnTime) {
      newFeedback = 'correct';
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else if (isCorrectNote && timeDiff < -300) {
      newFeedback = 'early';
    } else if (isCorrectNote && timeDiff > 300) {
      newFeedback = 'late';
    } else {
      newFeedback = 'wrong';
      setScore(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }

    setFeedback(newFeedback);
    setTimeout(() => setFeedback(null), 200);

    // Move to next note or complete
    if (isCorrectNote || newFeedback === 'wrong') {
      if (currentNoteIndex < totalNotes - 1) {
        setCurrentNoteIndex(prev => prev + 1);
      } else {
        stopPractice();
        setSectionComplete(true);
      }
    }
  };

  const goToNextSection = () => {
    if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
      setSectionComplete(false);
      setScore({ correct: 0, wrong: 0 });
      setCurrentNoteIndex(0);
    } else {
      // Lesson complete
      setShowReward(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate('/lessons')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Progress */}
        <div className="flex-1 mx-4">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${((currentSectionIndex + 1) / sections.length) * 100}%` }}
            />
          </div>
          <p className="text-white/40 text-xs text-center mt-1">
            Section {currentSectionIndex + 1} of {sections.length}
          </p>
        </div>

        <div className="w-10" />
      </header>

      {/* Lesson Title */}
      <div className="text-center px-4 py-2">
        <h1 className="text-white font-bold text-lg">{lesson.title}</h1>
        <p className="text-white/50 text-sm">{currentSection.title}</p>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Theory Section */}
        {currentSection.type === 'theory' && (
          <div className="max-w-md text-center">
            <span className="text-6xl mb-6 block">📖</span>
            <p className="text-white/80 text-lg leading-relaxed mb-8">
              {currentSection.content}
            </p>
            <button
              onClick={goToNextSection}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-bold"
            >
              Continue
            </button>
          </div>
        )}

        {/* Video Section */}
        {currentSection.type === 'video' && (
          <div className="max-w-md text-center">
            <span className="text-6xl mb-6 block">🎬</span>
            <p className="text-white/80 text-lg leading-relaxed mb-8">
              Watch the video demonstration for {currentSection.title.toLowerCase()}.
            </p>
            <button
              onClick={goToNextSection}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-bold"
            >
              Continue
            </button>
          </div>
        )}

        {/* Practice Section */}
        {(currentSection.type === 'practice' || currentSection.type === 'exercise') && (
          <>
            {!isPlaying && !sectionComplete ? (
              <div className="text-center">
                <span className="text-6xl mb-4 block">🎹</span>
                <p className="text-white/60 text-lg mb-2">
                  {currentSection.type === 'practice' ? 'Practice Time!' : 'Exercise Time!'}
                </p>
                <p className="text-white/40 text-sm mb-6">
                  {totalNotes} notes to play
                </p>
              </div>
            ) : isPlaying && currentNote ? (
              <div className="text-center mb-8">
                <p className="text-white/40 text-sm mb-2">Play this note</p>
                <div className={`
                  text-7xl font-black transition-all duration-100
                  ${feedback === 'correct' ? 'text-emerald-400 scale-110' : ''}
                  ${feedback === 'wrong' ? 'text-red-400' : ''}
                  ${feedback === 'early' ? 'text-yellow-400' : ''}
                  ${feedback === 'late' ? 'text-orange-400' : ''}
                  ${!feedback ? 'text-white' : ''}
                `}>
                  {currentNote.label}
                </div>
                <p className="text-white/40 text-sm mt-2">
                  {currentNoteIndex + 1} / {totalNotes}
                </p>
              </div>
            ) : sectionComplete ? (
              <div className="text-center">
                <span className="text-6xl mb-4 block">✨</span>
                <p className="text-white font-bold text-xl mb-2">Section Complete!</p>
                <p className="text-emerald-400 text-lg mb-6">
                  Accuracy: {accuracy}%
                </p>
              </div>
            ) : null}

            {/* Score Display */}
            {(isPlaying || sectionComplete) && (
              <div className="flex justify-center gap-8 py-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-emerald-400">{score.correct}</p>
                  <p className="text-xs text-white/40">Correct</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{accuracy}%</p>
                  <p className="text-xs text-white/40">Accuracy</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Piano */}
      {(currentSection.type === 'practice' || currentSection.type === 'exercise') && (
        <div className="bg-[#111] p-4 pb-6">
          <Piano
            startOctave={4}
            octaves={2}
            expectedNote={isPlaying ? currentNote?.midiNote : null}
            highlightMode={isPlaying ? 'expected' : 'none'}
            feedbackType={feedback}
            onNotePlay={handleNotePlay}
            showLabels
            enableSound
          />
        </div>
      )}

      {/* Control Button */}
      {(currentSection.type === 'practice' || currentSection.type === 'exercise') && (
        <div className="p-4 pb-8 bg-[#111]">
          {!isPlaying && !sectionComplete && (
            <button
              onClick={startPractice}
              className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl text-white font-bold text-lg"
            >
              Start Practice
            </button>
          )}
          {isPlaying && (
            <button
              onClick={stopPractice}
              className="w-full py-4 bg-white/10 rounded-2xl text-white font-medium"
            >
              Stop
            </button>
          )}
          {sectionComplete && (
            <button
              onClick={goToNextSection}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl text-white font-bold text-lg"
            >
              {currentSectionIndex < sections.length - 1 ? 'Next Section' : 'Complete Lesson'}
            </button>
          )}
        </div>
      )}

      {/* Reward Modal */}
      {showReward && (
        <RewardModal
          score={accuracy}
          xp={50}
          gems={accuracy >= 90 ? 15 : accuracy >= 70 ? 10 : 5}
          combo={0}
          streakDay={12}
          onClose={() => navigate('/lessons')}
        />
      )}
    </div>
  );
}
