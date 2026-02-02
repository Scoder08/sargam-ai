import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminTutorials, useDeleteTutorialMutation } from '@sargam/api';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';

export default function AdminTutorialsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, error } = useAdminTutorials({
    page,
    perPage: 20,
    search: search || undefined,
    difficulty: difficulty || undefined,
  });

  const deleteMutation = useDeleteTutorialMutation();

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tutorial? This cannot be undone.')) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteId(null);
    } catch (err) {
      alert('Failed to delete tutorial');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Tutorials</h1>
        <Link
          to="/admin/tutorials/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity"
        >
          <AddRoundedIcon sx={{ fontSize: 20 }} />
          Add Tutorial
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <SearchRoundedIcon
            sx={{ fontSize: 20 }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            placeholder="Search tutorials..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50"
          />
        </div>
        <select
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value);
            setPage(1);
          }}
          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
        >
          <option value="">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
          Failed to load tutorials
        </div>
      ) : (
        <>
          <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-white/60 text-sm font-medium">Song</th>
                  <th className="px-6 py-4 text-left text-white/60 text-sm font-medium">Artist</th>
                  <th className="px-6 py-4 text-left text-white/60 text-sm font-medium">Difficulty</th>
                  <th className="px-6 py-4 text-left text-white/60 text-sm font-medium">Plays</th>
                  <th className="px-6 py-4 text-left text-white/60 text-sm font-medium">Status</th>
                  <th className="px-6 py-4 text-right text-white/60 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.tutorials.map((tutorial) => (
                  <tr key={tutorial.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <MusicNoteRoundedIcon sx={{ fontSize: 20, color: 'white' }} />
                        </div>
                        <div>
                          <p className="text-white font-medium">{tutorial.title}</p>
                          {tutorial.movie && (
                            <p className="text-white/40 text-sm">{tutorial.movie}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/60">{tutorial.artist}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        tutorial.difficulty === 'beginner' ? 'bg-emerald-500/20 text-emerald-400' :
                        tutorial.difficulty === 'intermediate' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {tutorial.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/60">{tutorial.playCount}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {tutorial.isFree && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                            Free
                          </span>
                        )}
                        {tutorial.isPopular && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
                            Popular
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          to={`/admin/tutorials/${tutorial.id}/edit`}
                          className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                        >
                          <EditRoundedIcon sx={{ fontSize: 18 }} />
                        </Link>
                        <button
                          onClick={() => handleDelete(tutorial.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-all disabled:opacity-50"
                        >
                          <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data?.tutorials.length === 0 && (
              <div className="text-center py-12">
                <MusicNoteRoundedIcon sx={{ fontSize: 48 }} className="text-white/20 mb-4" />
                <p className="text-white/40">No tutorials found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-white/40 text-sm">
                Showing {(page - 1) * 20 + 1} - {Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white/5 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="px-4 py-2 bg-white/5 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
