import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <Card className="max-w-md w-full">
                <CardHeader>
                    <CardTitle>Панель врача</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Раздел в разработке. Здесь будет панель управления для врача с графиками прогресса пациентов.</p>
                </CardContent>
            </Card>
        </div>
    );
}
