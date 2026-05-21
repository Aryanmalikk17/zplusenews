import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function Religion() {
    return (
        <CategoryPageLayout
            category="religion"
            title="Religion"
            subtitle="Faith & Beliefs"
            description="Major world religions, religious history, festivals, and interfaith dialogue"
            accentColor="#f59e0b"
            heroImage="https://images.unsplash.com/photo-1548625361-155deee223cb?w=1600&q=80"
            iconClass="fa-solid fa-place-of-worship"
        />
    );
}
