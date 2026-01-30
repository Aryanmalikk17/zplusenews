import CategoryPageLayout from '../components/layout/CategoryPageLayout';

export default function InternationalNews() {
    return (
        <CategoryPageLayout
            category="international"
            title="International"
            subtitle="Global Headlines"
            description="World news, global affairs, international relations, and cross-border developments"
            accentColor="#8b5cf6"
            heroImage="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80"
            iconClass="fa-solid fa-globe"
        />
    );
}
