export default function Loader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'h-5 w-5' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6';
  return (
    <div className="flex items-center justify-center">
      <div className={`${s} animate-spin rounded-full border-2 border-primary-200 border-t-primary-600`} />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Loader size="lg" />
    </div>
  );
}
