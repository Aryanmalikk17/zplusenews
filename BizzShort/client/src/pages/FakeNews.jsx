import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function FakeNews() {
    return (
        <CategoryPageLayout
            category="fake-news"
            title="Fake News Exposed"
            description="Fact-checking and debunking misinformation to keep you informed with the truth"
            heroGradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            icon="🔍"
        />
    );
}
