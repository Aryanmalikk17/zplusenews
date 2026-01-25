import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function NationalNews() {
    return (
        <CategoryPageLayout
            category="national"
            title="National News"
            description="Breaking news and updates from across India"
            heroGradient="linear-gradient(135deg, #ff9a56 0%, #ff6a00 100%)"
            icon="🇮🇳"
        />
    );
}
