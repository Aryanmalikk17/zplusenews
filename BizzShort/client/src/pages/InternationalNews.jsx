import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function InternationalNews() {
    return (
        <CategoryPageLayout
            category="international"
            title="International News"
            description="Global news coverage from around the world"
            heroGradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            icon="🌍"
        />
    );
}
