"""Add AI Chat tables (sessions, messages, tool calls)

Revision ID: a1b2c3d4e5f6
Revises: 7c7ed2e4bf61
Create Date: 2026-07-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '7c7ed2e4bf61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'ai_chat_sessions',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_id', sa.String(length=36), nullable=False),
        sa.Column('repository_id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('provider_name', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=100), nullable=False),
        sa.Column('session_metadata', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['repository_id'], ['user_repositories.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_chat_sessions_repository_id'), 'ai_chat_sessions', ['repository_id'], unique=False)
    op.create_index(op.f('ix_ai_chat_sessions_user_id'), 'ai_chat_sessions', ['user_id'], unique=False)

    op.create_table(
        'ai_chat_messages',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('session_id', sa.String(length=36), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('message_metadata', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['ai_chat_sessions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_chat_messages_session_id'), 'ai_chat_messages', ['session_id'], unique=False)

    op.create_table(
        'ai_chat_tool_calls',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('message_id', sa.String(length=36), nullable=False),
        sa.Column('tool_name', sa.String(length=100), nullable=False),
        sa.Column('arguments_json', sa.Text(), nullable=False),
        sa.Column('result_json', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['ai_chat_messages.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_chat_tool_calls_message_id'), 'ai_chat_tool_calls', ['message_id'], unique=False)
    op.create_index(op.f('ix_ai_chat_tool_calls_tool_name'), 'ai_chat_tool_calls', ['tool_name'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_chat_tool_calls_tool_name'), table_name='ai_chat_tool_calls')
    op.drop_index(op.f('ix_ai_chat_tool_calls_message_id'), table_name='ai_chat_tool_calls')
    op.drop_table('ai_chat_tool_calls')

    op.drop_index(op.f('ix_ai_chat_messages_session_id'), table_name='ai_chat_messages')
    op.drop_table('ai_chat_messages')

    op.drop_index(op.f('ix_ai_chat_sessions_user_id'), table_name='ai_chat_sessions')
    op.drop_index(op.f('ix_ai_chat_sessions_repository_id'), table_name='ai_chat_sessions')
    op.drop_table('ai_chat_sessions')
