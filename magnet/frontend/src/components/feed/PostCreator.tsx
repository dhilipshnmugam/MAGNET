import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Play, Send, ArrowLeft, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../common/Avatar';
import { postService, uploadService, getApiError } from '../../services';
import toast from 'react-hot-toast';

interface PostCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

type PostMode = 'text' | 'image' | 'video';
type Step = 'type' | 'content' | 'preview';

export default function PostCreator({ isOpen, onClose, onPostCreated }: PostCreatorProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('type');
  const [mode, setMode] = useState<PostMode>('text');
  const [content, setContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('type');
    setMode('text');
    setContent('');
    setMediaFile(null);
    setMediaPreview('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectMode = (m: PostMode) => {
    setMode(m);
    setStep('content');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const goToPreview = () => {
    if (!content.trim()) {
      toast.error('Please write something');
      return;
    }
    if ((mode === 'image' || mode === 'video') && !mediaFile) {
      toast.error('Please select a media file');
      return;
    }
    setStep('preview');
  };

  const handlePublish = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      let imageUrl: string | undefined;
      let videoUrl: string | undefined;

      if (mediaFile) {
        const uploadRes = await uploadService.image(mediaFile, 'posts');
        const url = uploadRes.data.data.url;
        if (mode === 'image') imageUrl = url;
        else videoUrl = url;
      }

      const postData: any = {
        content: content.trim(),
        post_type: 'general',
        visibility: 'public',
      };
      if (imageUrl) postData.image_url = imageUrl;
      if (videoUrl) postData.video_url = videoUrl;

      await postService.create(postData);
      toast.success('Post published!');
      reset();
      onPostCreated?.();
      onClose();
    } catch (err) {
      toast.error(getApiError(err) || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          {step !== 'type' ? (
            <button onClick={() => setStep(step === 'preview' ? 'content' : 'type')} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {step === 'type' ? 'Create Post' : step === 'content' ? 'New Post' : 'Preview'}
          </h2>
          <button onClick={handleClose} className="rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Choose Type */}
          {step === 'type' && (
            <div className="space-y-3 py-4">
              <p className="text-center text-sm text-gray-500 mb-4">What would you like to share?</p>
              <button onClick={() => selectMode('text')} className="flex w-full items-center gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-900/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Text Post</p>
                  <p className="text-xs text-gray-500">Share a thought or update</p>
                </div>
              </button>
              <button onClick={() => selectMode('image')} className="flex w-full items-center gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:border-green-300 hover:bg-green-50 dark:border-gray-700 dark:hover:border-green-600 dark:hover:bg-green-900/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                  <ImageIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Image Post</p>
                  <p className="text-xs text-gray-500">Share a photo with caption</p>
                </div>
              </button>
              <button onClick={() => selectMode('video')} className="flex w-full items-center gap-4 rounded-xl border border-gray-200 p-4 transition-all hover:border-purple-300 hover:bg-purple-50 dark:border-gray-700 dark:hover:border-purple-600 dark:hover:bg-purple-900/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                  <Play className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">Video Post</p>
                  <p className="text-xs text-gray-500">Share a video with caption</p>
                </div>
              </button>
            </div>
          )}

          {/* Step 2: Content */}
          {step === 'content' && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Avatar src={user?.avatar_url} name={user?.full_name || 'U'} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">Posting publicly</p>
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={5}
                autoFocus
                className="w-full resize-none border-none bg-transparent text-sm leading-relaxed placeholder-gray-400 focus:outline-none"
              />
              {(mode === 'image' || mode === 'video') && (
                <div>
                  {mediaPreview ? (
                    <div className="relative">
                      {mode === 'image' ? (
                        <img src={mediaPreview} alt="" className="w-full max-h-64 rounded-xl object-cover" />
                      ) : (
                        <video src={mediaPreview} controls className="w-full max-h-64 rounded-xl" />
                      )}
                      <button onClick={() => { setMediaFile(null); setMediaPreview(''); }} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <input ref={fileInputRef} type="file" accept={mode === 'image' ? 'image/*' : 'video/*'} onChange={handleFileSelect} className="hidden" />
                  )}
                  {!mediaPreview && (
                    <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/10">
                      {mode === 'image' ? <ImageIcon className="h-8 w-8 text-gray-400" /> : <Play className="h-8 w-8 text-gray-400" />}
                      <span className="text-sm text-gray-500">Tap to select {mode}</span>
                    </button>
                  )}
                  {mediaPreview && (
                    <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-sm font-medium text-blue-500 hover:text-blue-600">
                      Change {mode}
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept={mode === 'image' ? 'image/*' : 'video/*'} onChange={handleFileSelect} className="hidden" />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <Avatar src={user?.avatar_url} name={user?.full_name || 'U'} size="sm" />
                <div>
                  <p className="text-sm font-semibold">{user?.full_name}</p>
                  <p className="text-xs text-gray-500">Posting publicly</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
              {mediaPreview && (
                mode === 'image' ? (
                  <img src={mediaPreview} alt="" className="w-full rounded-xl object-cover max-h-80" />
                ) : (
                  <video src={mediaPreview} controls className="w-full rounded-xl max-h-80" />
                )
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'content' && (
          <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700">
            <button onClick={goToPreview} disabled={!content.trim()} className="w-full rounded-xl bg-[#0095f6] py-2.5 text-sm font-semibold text-white hover:bg-[#1877f2] disabled:opacity-40 disabled:cursor-not-allowed">
              Preview
            </button>
          </div>
        )}
        {step === 'preview' && (
          <div className="border-t border-gray-200 px-5 py-4 dark:border-gray-700 flex gap-3">
            <button onClick={() => setStep('content')} className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-semibold hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
              Back
            </button>
            <button onClick={handlePublish} disabled={loading} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#0095f6] py-2.5 text-sm font-semibold text-white hover:bg-[#1877f2] disabled:opacity-50">
              {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <><Send className="h-4 w-4" /> Publish</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
