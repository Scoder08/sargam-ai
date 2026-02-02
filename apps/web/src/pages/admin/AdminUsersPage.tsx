import { useState } from 'react';
import {
  useAdminUsers,
  useAddUserGemsMutation,
  useSetUserPremiumMutation,
  useSetUserAdminMutation,
  useDeleteUserMutation,
} from '@sargam/api';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [gemAmount, setGemAmount] = useState('100');
  const [gemReason, setGemReason] = useState('');

  const { data, isLoading, error } = useAdminUsers({
    page,
    perPage: 20,
    search: search || undefined,
  });

  const addGemsMutation = useAddUserGemsMutation();
  const setPremiumMutation = useSetUserPremiumMutation();
  const setAdminMutation = useSetUserAdminMutation();
  const deleteUserMutation = useDeleteUserMutation();

  const handleAddGems = async () => {
    if (!selectedUser || !gemAmount) return;
    try {
      await addGemsMutation.mutateAsync({
        userId: selectedUser.id,
        amount: parseInt(gemAmount),
        reason: gemReason || undefined,
      });
      setGemAmount('100');
      setGemReason('');
      alert(`Added ${gemAmount} gems to ${selectedUser.name}`);
    } catch (err) {
      alert('Failed to add gems');
    }
  };

  const handleTogglePremium = async (user: any) => {
    try {
      await setPremiumMutation.mutateAsync({
        userId: user.id,
        isPremium: !user.isPremium,
        days: 30,
      });
    } catch (err) {
      alert('Failed to update premium status');
    }
  };

  const handleToggleAdmin = async (user: any) => {
    if (!confirm(`Are you sure you want to ${user.isAdmin ? 'revoke' : 'grant'} admin access for ${user.name}?`)) {
      return;
    }
    try {
      await setAdminMutation.mutateAsync({
        userId: user.id,
        isAdmin: !user.isAdmin,
      });
    } catch (err) {
      alert('Failed to update admin status');
    }
  };

  const handleDelete = async (user: any) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteUserMutation.mutateAsync(user.id);
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">Users</h1>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <SearchRoundedIcon
            sx={{ fontSize: 20 }}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
          Failed to load users
        </div>
      ) : (
        <>
          <div className="bg-[#111] rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-left text-white/60 text-sm font-medium">User</th>
                  <th className="px-6 py-4 text-left text-white/60 text-sm font-medium">Contact</th>
                  <th className="px-6 py-4 text-left text-white/60 text-sm font-medium">Stats</th>
                  <th className="px-6 py-4 text-left text-white/60 text-sm font-medium">Status</th>
                  <th className="px-6 py-4 text-right text-white/60 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {user.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.name}</p>
                          <p className="text-white/40 text-sm">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white/60">{user.email || user.phone || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <DiamondRoundedIcon sx={{ fontSize: 16 }} className="text-cyan-400" />
                          <span className="text-white/60 text-sm">{user.gems}</span>
                        </div>
                        <span className="text-white/40">|</span>
                        <span className="text-white/60 text-sm">Lv.{user.level}</span>
                        <span className="text-white/40">|</span>
                        <span className="text-white/60 text-sm">{user.streak} streak</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.isPremium && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                            Premium
                          </span>
                        )}
                        {user.isAdmin && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="p-2 rounded-lg bg-white/5 text-cyan-400 hover:bg-cyan-500/20 transition-all"
                          title="Add Gems"
                        >
                          <DiamondRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                        <button
                          onClick={() => handleTogglePremium(user)}
                          disabled={setPremiumMutation.isPending}
                          className={`p-2 rounded-lg transition-all ${
                            user.isPremium
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              : 'bg-white/5 text-white/60 hover:bg-amber-500/20 hover:text-amber-400'
                          }`}
                          title={user.isPremium ? 'Revoke Premium' : 'Grant Premium'}
                        >
                          <StarRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                        <button
                          onClick={() => handleToggleAdmin(user)}
                          disabled={setAdminMutation.isPending}
                          className={`p-2 rounded-lg transition-all ${
                            user.isAdmin
                              ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                              : 'bg-white/5 text-white/60 hover:bg-purple-500/20 hover:text-purple-400'
                          }`}
                          title={user.isAdmin ? 'Revoke Admin' : 'Grant Admin'}
                        >
                          <AdminPanelSettingsRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deleteUserMutation.isPending}
                          className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-red-500/20 hover:text-red-400 transition-all"
                          title="Delete User"
                        >
                          <DeleteRoundedIcon sx={{ fontSize: 18 }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data?.users.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/40">No users found</p>
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

      {/* Add Gems Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#111] rounded-2xl border border-white/10 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add Gems</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60"
              >
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            <p className="text-white/60 mb-4">
              Adding gems to <span className="text-white font-medium">{selectedUser.name}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">Amount</label>
                <input
                  type="number"
                  value={gemAmount}
                  onChange={(e) => setGemAmount(e.target.value)}
                  min="1"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-2">Reason (optional)</label>
                <input
                  type="text"
                  value={gemReason}
                  onChange={(e) => setGemReason(e.target.value)}
                  placeholder="e.g., Contest winner, Bug report reward"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-orange-500/50"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 px-4 py-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGems}
                disabled={addGemsMutation.isPending || !gemAmount}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {addGemsMutation.isPending ? 'Adding...' : 'Add Gems'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
