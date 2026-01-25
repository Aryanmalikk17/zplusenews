import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function PositiveNews() {
    return (
        <CategoryPageLayout
            category="positive"
            title="Positive News"
            description="Uplifting stories that inspire hope and celebrate humanity's achievements"
            heroGradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            icon="🌟"
        />
    );
}
