import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import Home from './pages/Home';
import ChannelDetail from './pages/ChannelDetail';
import FolderDetail from './pages/FolderDetail';
import AllChannelsPage from './pages/AllChannelsPage';
import AllVideosPage from './pages/AllVideosPage';
import BrowsePage from './pages/BrowsePage';
import ShareTarget from './pages/ShareTarget';

function App() {
    return (
        <ToastProvider>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/channel/:id" element={<ChannelDetail />} />
                <Route path="/folder/:id" element={<FolderDetail />} />
                <Route path="/channels" element={<AllChannelsPage />} />
                <Route path="/videos" element={<AllVideosPage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/share" element={<ShareTarget />} />
            </Routes>
            <ToastContainer />
        </ToastProvider>
    );
}

export default App;
