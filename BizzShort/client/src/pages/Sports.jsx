import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Sports() {
    return (
        <CategoryPageLayout
            category="sports"
            title="Sports"
            description="Latest sports news, scores, and athletic achievements"
            heroGradient="linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)"
            icon="⚽"
        />
    );
}
