import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function NationalNews() {
    return (
        <CategoryPageLayout
            category="national"
            title="National"
            subtitle="India Today"
            description="National headlines, domestic affairs, policy updates, and stories from across India"
            accentColor="#ff9933"
            heroImage="https://images.unsplash.com/photo-1532375810709-75b1da00537c?w=1600&q=80"
            iconClass="fa-solid fa-flag"
        />
    );
}
