import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Economics() {
    return (
        <CategoryPageLayout
            category="economics"
            title="Economics"
            description="Financial news, market trends, and economic analysis"
            heroGradient="linear-gradient(135deg, #2dce89 0%, #2dcecc 100%)"
            icon="💰"
        />
    );
}
