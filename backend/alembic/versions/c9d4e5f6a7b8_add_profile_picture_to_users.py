"""add profile picture columns to users

Revision ID: c9d4e5f6a7b8
Revises: b766999cc5e5
Create Date: 2026-04-26 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c9d4e5f6a7b8"
down_revision = "b766999cc5e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("profile_picture_data", sa.LargeBinary(), nullable=True))
    op.add_column(
        "users", sa.Column("profile_picture_content_type", sa.String(), nullable=True)
    )
    op.add_column(
        "users", sa.Column("profile_picture_updated_at", sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("users", "profile_picture_updated_at")
    op.drop_column("users", "profile_picture_content_type")
    op.drop_column("users", "profile_picture_data")
