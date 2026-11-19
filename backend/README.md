# NexTech Backend API

Laravel 12 REST API backend powering the NexTech Inventory & Order Management System.

- **Authentication**: Laravel Sanctum Bearer tokens
- **Database**: MySQL with ACID transactions & concurrency locking
- **Timezone**: `Asia/Karachi` (+05:00)

## Quick Start
```bash
composer install
php artisan migrate --seed
php artisan test
php artisan serve
```

For complete system documentation, architecture diagrams, and endpoint examples, please refer to:
- [Root README.md](../README.md)
- [Database Schema & API Documentation](../docs/DATABASE_AND_API.md)
- [Business Rules](../docs/BUSINESS_RULES.md)
