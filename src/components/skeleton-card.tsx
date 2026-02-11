'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function SkeletonCard() {
    return (
        <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 animate-pulse">
            <div className="flex-1 w-full sm:w-auto mb-4 sm:mb-0 space-y-3">
                <Skeleton className="h-5 w-48 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-3 w-40 rounded-md" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
            </div>
        </Card>
    );
}
