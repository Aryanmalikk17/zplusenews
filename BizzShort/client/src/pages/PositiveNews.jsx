import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function PositiveNews() {
    return (
        <CategoryPageLayout
            category="positive"
            title="Positive News"
            subtitle="Good News That Matters"
            description="Uplifting stories that inspire hope and celebrate humanity's achievements and breakthroughs"
            accentColor="#22c55e"
            heroImage="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&q=80"
            iconClass="fa-solid fa-sun"
        />
    );
}
