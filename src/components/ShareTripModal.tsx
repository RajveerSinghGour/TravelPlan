import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Copy, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  tripName: string;
}

const ShareTripModal = ({ isOpen, onClose, shareUrl, tripName }: ShareTripModalProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check out my ${tripName}!`,
          text: `I created an awesome travel itinerary. Take a look!`,
          url: shareUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Share2 className="h-5 w-5 text-blue-600" />
            </div>
            Share Your Trip
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Trip Ready to Share!</span>
            </div>
            <p className="text-sm text-blue-700">
              Anyone with this link can view your "{tripName}" itinerary
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="flex-1"
            />
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="px-3"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1 text-green-600"
                  >
                    <Check className="h-4 w-4" />
                    <span className="text-xs">Copied!</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="text-xs">Copy</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>

          <div className="flex gap-2">
            {navigator.share && (
              <Button onClick={shareNative} className="flex-1" variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share via Apps
              </Button>
            )}
            <Button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-700">
              Done
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              🔗 This link will work forever and updates automatically when you edit your trip
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareTripModal;
