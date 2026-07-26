import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';

export default function StoriesBar() {
  const { user } = useAuth();

  return (
    <div className="border-b border-gray-200 bg-white py-4 dark:border-gray-800 dark:bg-gray-900 lg:rounded-lg lg:border">
      <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
        {/* Your story */}
        <button className="flex flex-shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <div className="h-[62px] w-[62px] rounded-full border-2 border-gray-200 p-[2px] dark:border-gray-700">
              <Avatar src={user?.avatar_url} name={user?.full_name || 'U'} className="h-full w-full" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#0095f6] text-white dark:border-gray-900">
              <span className="text-[10px] font-bold">+</span>
            </div>
          </div>
          <span className="w-[68px] truncate text-center text-[11px] text-gray-500">Your story</span>
        </button>
      </div>
    </div>
  );
}
