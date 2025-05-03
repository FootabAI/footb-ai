import { Loader2 } from 'lucide-react';

const Loader = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-footbai-background">
      <Loader2 className="h-8 w-8 animate-spin text-footbai-accent" />
    </div>
  );
};

export default Loader;