import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';

// Add page imports here
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import NodeDetail from '@/pages/NodeDetail';
import CreateNode from '@/pages/CreateNode';
import NodeList from '@/pages/NodeList';
import EdgeList from '@/pages/EdgeList';
import ApiDocs from '@/pages/ApiDocs';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/nodes" element={<NodeList />} />
        <Route path="/nodes/new" element={<CreateNode />} />
        <Route path="/nodes/:nodeId" element={<NodeDetail />} />
        <Route path="/edges" element={<EdgeList />} />
        <Route path="/api" element={<ApiDocs />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App