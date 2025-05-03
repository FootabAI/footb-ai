import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Github, Loader2 } from 'lucide-react';
import { useUserStore } from '@/stores/useUserStore';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, handleGithubLogin } = useUserStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, email.split('@')[0]);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithub = async () => {
    setIsLoading(true);
    try {
      await handleGithubLogin();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-footbai-background p-4">
      <Card className="w-full max-w-md bg-footbai-container border-footbai-header">
        <CardHeader className="bg-footbai-header">
          <CardTitle className="text-xl text-center text-white">
            {isLogin ? 'Login' : 'Register'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="login" value={isLogin ? 'login' : 'register'} onValueChange={(v) => setIsLogin(v === 'login')}>
            <TabsList className="bg-footbai-header">
              <TabsTrigger value="login" className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black">
                Login
              </TabsTrigger> 
              <TabsTrigger value="register" className="data-[state=active]:bg-footbai-accent data-[state=active]:text-black">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button 
                  type="submit" 
                  className="w-full bg-footbai-accent hover:bg-footbai-accent/80 text-black font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isLogin ? 'Logging in...' : 'Registering...'}
                    </>
                  ) : (
                    isLogin ? 'Login' : 'Register'
                  )}
                </Button>
              </form>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-footbai-hover" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-footbai-container px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <Button
                onClick={handleGithub}
                variant="outline"
                className="w-full border-footbai-header hover:bg-footbai-hover"
                disabled={isLoading}
              >
                <Github className="mr-2 h-4 w-4" />
                GitHub
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-footbai-header border-footbai-hover focus:ring-footbai-accent"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Button 
                  type="submit" 
                  className="w-full bg-footbai-accent hover:bg-footbai-accent/80 text-black font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Register'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login; 