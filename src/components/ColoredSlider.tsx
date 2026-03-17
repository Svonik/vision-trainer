import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type Channel = 'red' | 'cyan' | 'neutral';

interface ColoredSliderProps {
    channel: Channel;
    value: number[];
    min: number;
    max: number;
    step: number;
    onValueChange: (value: number[]) => void;
    className?: string;
    'aria-label'?: string;
}

const TRACK_STYLES: Record<Channel, string> = {
    red: '[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-red-900/50 [&_[data-slot=slider-range]]:to-[var(--red-soft)] [&_[data-slot=slider-thumb]]:shadow-[0_0_12px_rgba(255,107,138,0.4)] [&_[data-slot=slider-thumb]]:border-[var(--red-soft)]',
    cyan: '[&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-cyan-900/50 [&_[data-slot=slider-range]]:to-[var(--cyan-soft)] [&_[data-slot=slider-thumb]]:shadow-[0_0_12px_rgba(107,223,255,0.4)] [&_[data-slot=slider-thumb]]:border-[var(--cyan-soft)]',
    neutral: '',
};

export function ColoredSlider({
    channel,
    value,
    min,
    max,
    step,
    onValueChange,
    className,
    ...rest
}: ColoredSliderProps) {
    return (
        <Slider
            value={value}
            min={min}
            max={max}
            step={step}
            onValueChange={onValueChange}
            className={cn(TRACK_STYLES[channel], className)}
            {...rest}
        />
    );
}
