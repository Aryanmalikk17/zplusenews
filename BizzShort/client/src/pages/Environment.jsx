import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Environment() {
    return (
        <CategoryPageLayout
            category="environment"
            title="Environment"
            description="Climate change, sustainability, and environmental conservation news"
            heroGradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
            icon="🌱"
        />
    );
}
