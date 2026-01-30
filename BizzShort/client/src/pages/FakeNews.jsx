import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function FakeNews() {
    return (
        <CategoryPageLayout
            category="fake-news"
            title="Fake News Exposed"
            subtitle="Truth Uncovered"
            description="Fact-checking and debunking misinformation to keep you informed with verified truth"
            accentColor="#ef4444"
            heroImage="https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&q=80"
            iconClass="fa-solid fa-magnifying-glass"
        />
    );
}
