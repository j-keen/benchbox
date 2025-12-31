import React from 'react';

export function SkeletonBox({ className = '' }) {
    return (
        <div className={`bg-gray-200 animate-pulse rounded ${className}`} />
    );
}

export function VideoCardSkeleton() {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <SkeletonBox className="aspect-video w-full" />
            <div className="p-3 space-y-2">
                <SkeletonBox className="h-4 w-full" />
                <SkeletonBox className="h-4 w-2/3" />
                <div className="flex items-center gap-2 mt-2">
                    <SkeletonBox className="h-3 w-16" />
                    <SkeletonBox className="h-3 w-20" />
                </div>
            </div>
        </div>
    );
}

export function ChannelCardSkeleton() {
    return (
        <div className="flex-shrink-0 w-36 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <SkeletonBox className="aspect-video w-full" />
            <div className="p-2 space-y-1.5">
                <SkeletonBox className="h-4 w-full" />
                <SkeletonBox className="h-3 w-16" />
            </div>
        </div>
    );
}

export function FolderCardSkeleton() {
    return (
        <div className="flex-shrink-0 w-40 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-start gap-3">
                <SkeletonBox className="w-10 h-10 rounded" />
                <div className="flex-1 space-y-2">
                    <SkeletonBox className="h-4 w-full" />
                    <SkeletonBox className="h-3 w-16" />
                </div>
            </div>
        </div>
    );
}

export function VideoGridSkeleton({ count = 10 }) {
    return (
        <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="break-inside-avoid">
                    <VideoCardSkeleton />
                </div>
            ))}
        </div>
    );
}

export function ChannelRowSkeleton({ count = 6 }) {
    return (
        <div className="flex gap-3 overflow-x-hidden">
            {Array.from({ length: count }).map((_, i) => (
                <ChannelCardSkeleton key={i} />
            ))}
        </div>
    );
}
