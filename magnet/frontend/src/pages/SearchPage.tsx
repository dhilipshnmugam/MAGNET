import { useState, useEffect } from 'react';
import { searchService } from '../services';
import { Search as SearchIcon } from 'lucide-react';
import { useDebounce } from '../hooks';
import Avatar from '../components/common/Avatar';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/common/EmptyState';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults(null); return; }
    setLoading(true);
    searchService.search(debouncedQuery).then((res) => { setResults(res.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, [debouncedQuery]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Search</h1>
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="input pl-10 text-lg" placeholder="Search users, channels, posts..." autoFocus />
      </div>

      {results && (
        <div className="space-y-6">
          {results.users?.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-gray-500">Users</h3>
              <div className="space-y-2">
                {results.users.map((u: any) => (
                  <div key={u.id} className="card flex items-center gap-3 p-3 cursor-pointer hover:shadow-md" onClick={() => navigate(`/profile/${u.id}`)}>
                    <Avatar src={u.avatar_url} name={u.full_name} />
                    <div><p className="font-medium">{u.full_name}</p><p className="text-xs text-gray-500 capitalize">{u.role}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.channels?.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-gray-500">Channels</h3>
              <div className="space-y-2">
                {results.channels.map((c: any) => (
                  <div key={c.id} className="card flex items-center gap-3 p-3 cursor-pointer hover:shadow-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 font-bold">#</div>
                    <div><p className="font-medium">{c.name}</p><p className="text-xs text-gray-500">{c.member_count} members</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.posts?.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-gray-500">Posts</h3>
              <div className="space-y-2">
                {results.posts.map((p: any) => (
                  <div key={p.id} className="card p-3">
                    <p className="text-sm">{p.content}</p>
                    <p className="mt-1 text-xs text-gray-400">{p.like_count} likes</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!results.users?.length && !results.channels?.length && !results.posts?.length) && (
            <EmptyState title="No results found" description={`No results for "${query}"`} />
          )}
        </div>
      )}
    </div>
  );
}
