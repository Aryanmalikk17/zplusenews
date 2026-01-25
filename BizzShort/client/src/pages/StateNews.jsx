import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function StateNews() {
    return (
        <CategoryPageLayout
            category="state"
            title="State News"
            description="Local news and updates from states across India"
            heroGradient="linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
            icon="📍"
        />
    );
}
