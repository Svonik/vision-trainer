import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProfilePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle>Профиль пациента</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Раздел в разработке. Здесь будет история сессий и графики прогресса.</p>
                </CardContent>
            </Card>
        </div>
    );
}
