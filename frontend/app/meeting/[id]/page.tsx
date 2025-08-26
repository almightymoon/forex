'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, Mic, MicOff, VideoOff, Phone, Users, MessageSquare, Share2, Settings } from 'lucide-react';

export default function MeetingRoom({ params }: { params: { id: string } }) {
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([
    { id: 1, name: 'You', isHost: true, isVideoOn: false, isMicOn: false }
  ]);

  const toggleVideo = () => setIsVideoOn(!isVideoOn);
  const toggleMic = () => setIsMicOn(!isMicOn);
  const toggleScreenShare = () => setIsScreenSharing(!isScreenSharing);

  const leaveMeeting = () => {
    if (confirm('Are you sure you want to leave the meeting?')) {
      window.close();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Meeting Room</h1>
          <span className="text-sm text-gray-300">ID: {params.id}</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-300">Participants: {participants.length}</span>
          <button className="text-gray-300 hover:text-white">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Video Area */}
        <div className="flex-1 p-6">
          <div className="bg-gray-800 rounded-lg h-full flex items-center justify-center relative">
            {isVideoOn ? (
              <div className="text-center">
                <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-16 h-16 text-white" />
                </div>
                <p className="text-gray-300">Your video is now on</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <VideoOff className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-gray-300">Camera is off</p>
              </div>
            )}
            
            {/* Meeting Info Overlay */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg p-3">
              <p className="text-sm font-medium">Meeting Room: {params.id}</p>
              <p className="text-xs text-gray-300">Started by you</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 p-4">
          <h3 className="text-lg font-semibold mb-4">Participants</h3>
          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">{participant.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{participant.name}</p>
                  {participant.isHost && <span className="text-xs text-blue-400">Host</span>}
                </div>
                <div className="flex space-x-2">
                  {participant.isMicOn ? (
                    <Mic className="w-4 h-4 text-green-400" />
                  ) : (
                    <MicOff className="w-4 h-4 text-gray-400" />
                  )}
                  {participant.isVideoOn ? (
                    <Video className="w-4 h-4 text-green-400" />
                  ) : (
                    <VideoOff className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Meeting Controls</h4>
            <div className="space-y-2">
              <button
                onClick={toggleVideo}
                className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
                  isVideoOn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {isVideoOn ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                <span>{isVideoOn ? 'Turn Off Video' : 'Turn On Video'}</span>
              </button>
              
              <button
                onClick={toggleMic}
                className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
                  isMicOn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {isMicOn ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMicOn ? 'Mute' : 'Unmute'}</span>
              </button>

              <button
                onClick={toggleScreenShare}
                className={`w-full p-2 rounded-lg flex items-center justify-center space-x-2 ${
                  isScreenSharing ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>{isScreenSharing ? 'Stop Sharing' : 'Share Screen'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={toggleMic}
            className={`p-3 rounded-full ${
              isMicOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full ${
              isVideoOn ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full ${
              isScreenSharing ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
            }`}
          >
            <Share2 className="w-6 h-6" />
          </button>

          <button
            onClick={leaveMeeting}
            className="p-3 rounded-full bg-red-600 hover:bg-red-700"
          >
            <Phone className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
