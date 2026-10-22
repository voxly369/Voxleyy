export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appeals: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: Database["public"]["Enums"]["appeal_decision"] | null
          id: string
          message: string
          moderation_action_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["appeal_decision"] | null
          id?: string
          message: string
          moderation_action_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: Database["public"]["Enums"]["appeal_decision"] | null
          id?: string
          message?: string
          moderation_action_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      book_entitlements: {
        Row: {
          book_id: string
          created_at: string
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["book_entitlement_kind"]
          starts_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["book_entitlement_kind"]
          starts_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["book_entitlement_kind"]
          starts_at?: string
          user_id?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author_id: string
          created_at: string
          currency: string
          description: string
          id: string
          isbn_internal: string | null
          price_cents: number
          rental_days: number | null
          sale_model: Database["public"]["Enums"]["book_sale_model"]
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          currency?: string
          description?: string
          id: string
          isbn_internal?: string | null
          price_cents?: number
          rental_days?: number | null
          sale_model?: Database["public"]["Enums"]["book_sale_model"]
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          isbn_internal?: string | null
          price_cents?: number
          rental_days?: number | null
          sale_model?: Database["public"]["Enums"]["book_sale_model"]
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chapters: {
        Row: {
          body_json: Json | null
          body_text: string | null
          book_id: string
          created_at: string
          id: string
          is_removed: boolean
          is_sample: boolean
          position: number
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["publish_status"]
          title: string | null
          updated_at: string
          word_count: number
        }
        Insert: {
          body_json?: Json | null
          body_text?: string | null
          book_id: string
          created_at?: string
          id?: string
          is_removed?: boolean
          is_sample?: boolean
          position: number
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string | null
          updated_at?: string
          word_count?: number
        }
        Update: {
          body_json?: Json | null
          body_text?: string | null
          book_id?: string
          created_at?: string
          id?: string
          is_removed?: boolean
          is_sample?: boolean
          position?: number
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string | null
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          creation_id: string
          id: string
          is_removed: boolean
          parent_id: string | null
          removed_reason: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          creation_id: string
          id?: string
          is_removed?: boolean
          parent_id?: string | null
          removed_reason?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          creation_id?: string
          id?: string
          is_removed?: boolean
          parent_id?: string | null
          removed_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      mentions: {
        Row: {
          author_id: string
          comment_id: string
          created_at: string
          creation_id: string
          mentioned_user_id: string
        }
        Insert: {
          author_id: string
          comment_id: string
          created_at?: string
          creation_id: string
          mentioned_user_id: string
        }
        Update: {
          author_id?: string
          comment_id?: string
          created_at?: string
          creation_id?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creation_tags: {
        Row: {
          creation_id: string
          tag: string
        }
        Insert: {
          creation_id: string
          tag: string
        }
        Update: {
          creation_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "creation_tags_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
        ]
      }
      creations: {
        Row: {
          audience: Database["public"]["Enums"]["audience"]
          author_id: string
          body_json: Json | null
          body_text: string | null
          caption: string | null
          comment_count: number
          country: string | null
          cover_url: string | null
          created_at: string
          genre: string | null
          id: string
          is_removed: boolean
          language: string
          like_count: number
          media_meta: Json
          media_url: string | null
          mood: string | null
          published_at: string | null
          removed_reason: string | null
          save_count: number
          search_tsv: unknown
          status: Database["public"]["Enums"]["publish_status"]
          title: string | null
          type: Database["public"]["Enums"]["creation_type"]
          updated_at: string
          view_count: number
        }
        Insert: {
          audience?: Database["public"]["Enums"]["audience"]
          author_id: string
          body_json?: Json | null
          body_text?: string | null
          caption?: string | null
          comment_count?: number
          country?: string | null
          cover_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          is_removed?: boolean
          language?: string
          like_count?: number
          media_meta?: Json
          media_url?: string | null
          mood?: string | null
          published_at?: string | null
          removed_reason?: string | null
          save_count?: number
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string | null
          type: Database["public"]["Enums"]["creation_type"]
          updated_at?: string
          view_count?: number
        }
        Update: {
          audience?: Database["public"]["Enums"]["audience"]
          author_id?: string
          body_json?: Json | null
          body_text?: string | null
          caption?: string | null
          comment_count?: number
          country?: string | null
          cover_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          is_removed?: boolean
          language?: string
          like_count?: number
          media_meta?: Json
          media_url?: string | null
          mood?: string | null
          published_at?: string | null
          removed_reason?: string | null
          save_count?: number
          search_tsv?: unknown
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string | null
          type?: Database["public"]["Enums"]["creation_type"]
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "creations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creations_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          followee_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followee_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followee_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string
          creation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creation_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          creation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: Database["public"]["Enums"]["mod_action"]
          actor_id: string
          created_at: string
          id: string
          reason: string
          report_id: string | null
          target_id: string | null
          target_type: string
          target_user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["mod_action"]
          actor_id: string
          created_at?: string
          id?: string
          reason: string
          report_id?: string | null
          target_id?: string | null
          target_type: string
          target_user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["mod_action"]
          actor_id?: string
          created_at?: string
          id?: string
          reason?: string
          report_id?: string | null
          target_id?: string | null
          target_type?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          held: boolean
          id: string
          read_at: string | null
          recipient_id: string
          target_id: string | null
          target_type: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          held?: boolean
          id?: string
          read_at?: string | null
          recipient_id: string
          target_id?: string | null
          target_type?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          held?: boolean
          id?: string
          read_at?: string | null
          recipient_id?: string
          target_id?: string | null
          target_type?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          digest_enabled: boolean
          digest_last_date: string | null
          digest_time: string | null
          notify_announcements: boolean
          notify_chapters: boolean
          notify_comments: boolean
          notify_follows: boolean
          notify_likes: boolean
          notify_mentions: boolean
          notify_messages: boolean
          notify_sales: boolean
          quiet_enabled: boolean
          quiet_manual: boolean
          quiet_reach: string
          quiet_schedule_end: string | null
          quiet_schedule_start: string | null
          quiet_summary_pending: number
          show_local_time: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          digest_enabled?: boolean
          digest_last_date?: string | null
          digest_time?: string | null
          notify_announcements?: boolean
          notify_chapters?: boolean
          notify_comments?: boolean
          notify_follows?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_sales?: boolean
          quiet_enabled?: boolean
          quiet_manual?: boolean
          quiet_reach?: string
          quiet_schedule_end?: string | null
          quiet_schedule_start?: string | null
          quiet_summary_pending?: number
          show_local_time?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          digest_enabled?: boolean
          digest_last_date?: string | null
          digest_time?: string | null
          notify_announcements?: boolean
          notify_chapters?: boolean
          notify_comments?: boolean
          notify_follows?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_messages?: boolean
          notify_sales?: boolean
          quiet_enabled?: boolean
          quiet_manual?: boolean
          quiet_reach?: string
          quiet_schedule_end?: string | null
          quiet_schedule_start?: string | null
          quiet_summary_pending?: number
          show_local_time?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          actor_id: string | null
          created_at: string
          data: Json
          id: string
          read_at: string | null
          recipient_id: string
          target_id: string | null
          target_type: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          recipient_id: string
          target_id?: string | null
          target_type?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          read_at?: string | null
          recipient_id?: string
          target_id?: string | null
          target_type?: string | null
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string
          city: string | null
          city_visible: boolean
          country: string | null
          created_at: string
          creation_count: number
          display_name: string
          follower_count: number
          following_count: number
          id: string
          language: string
          role: Database["public"]["Enums"]["user_role"]
          show_local_time: boolean
          status: Database["public"]["Enums"]["account_status"]
          status_reason: string | null
          suspended_until: string | null
          timezone: string
          updated_at: string
          username: string
          verified: boolean
          website: string | null
          who_can_message: string
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string
          city?: string | null
          city_visible?: boolean
          country?: string | null
          created_at?: string
          creation_count?: number
          display_name?: string
          follower_count?: number
          following_count?: number
          id: string
          language?: string
          role?: Database["public"]["Enums"]["user_role"]
          show_local_time?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          status_reason?: string | null
          suspended_until?: string | null
          timezone?: string
          updated_at?: string
          username: string
          verified?: boolean
          website?: string | null
          who_can_message?: string
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string
          city?: string | null
          city_visible?: boolean
          country?: string | null
          created_at?: string
          creation_count?: number
          display_name?: string
          follower_count?: number
          following_count?: number
          id?: string
          language?: string
          role?: Database["public"]["Enums"]["user_role"]
          show_local_time?: boolean
          status?: Database["public"]["Enums"]["account_status"]
          status_reason?: string | null
          suspended_until?: string | null
          timezone?: string
          updated_at?: string
          username?: string
          verified?: boolean
          website?: string | null
          who_can_message?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          chapter_id: string | null
          completed: boolean
          first_read_at: string | null
          percent: number
          position: number
          position_offset: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id?: string | null
          completed?: boolean
          first_read_at?: string | null
          percent?: number
          position?: number
          position_offset?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string | null
          completed?: boolean
          first_read_at?: string | null
          percent?: number
          position?: number
          position_offset?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      hidden_words: {
        Row: {
          created_at: string
          user_id: string
          word: string
        }
        Insert: {
          created_at?: string
          user_id: string
          word: string
        }
        Update: {
          created_at?: string
          user_id?: string
          word?: string
        }
        Relationships: []
      }
      mutes: {
        Row: {
          created_at: string
          muted_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          muted_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          muted_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
        Row: {
          created_at: string
          creation_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creation_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          creation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saves_creation_id_fkey"
            columns: ["creation_id"]
            isOneToOne: false
            referencedRelation: "creations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saves_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reading_progress: {
        Row: {
          user_id: string
          creation_id: string
          percent: number
          position: number
          position_offset: number
          completed: boolean
          first_read_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          creation_id: string
          percent?: number
          position?: number
          position_offset?: number
          completed?: boolean
          first_read_at?: string
          updated_at?: string
        }
        Update: {
          percent?: number
          position?: number
          position_offset?: number
          completed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      reader_highlights: {
        Row: {
          id: string
          user_id: string
          creation_id: string | null
          chapter_id: string | null
          start_paragraph: number
          start_char: number
          end_paragraph: number
          end_char: number
          quote: string
          colour: string
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          creation_id?: string | null
          chapter_id?: string | null
          start_paragraph: number
          start_char: number
          end_paragraph: number
          end_char: number
          quote: string
          colour: string
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          start_paragraph?: number
          start_char?: number
          end_paragraph?: number
          end_char?: number
          quote?: string
          colour?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reader_bookmarks: {
        Row: {
          id: string
          user_id: string
          creation_id: string | null
          chapter_id: string | null
          paragraph: number
          paragraph_offset: number
          label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          creation_id?: string | null
          chapter_id?: string | null
          paragraph: number
          paragraph_offset?: number
          label?: string | null
          created_at?: string
        }
        Update: {
          paragraph?: number
          paragraph_offset?: number
          label?: string | null
        }
        Relationships: []
      }
      reader_collections: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      reader_collection_items: {
        Row: {
          collection_id: string
          creation_id: string
          added_at: string
        }
        Insert: {
          collection_id: string
          creation_id: string
          added_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      reader_preferences: {
        Row: {
          user_id: string
          preferences: Json
          updated_at: string
        }
        Insert: {
          user_id: string
          preferences?: Json
          updated_at?: string
        }
        Update: {
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      warnings: {
        Row: {
          created_at: string
          created_by: string
          id: string
          message: string
          seen_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          message: string
          seen_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          seen_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          city: string | null
          city_visible: boolean | null
          country: string | null
          created_at: string | null
          creation_count: number | null
          display_name: string | null
          follower_count: number | null
          following_count: number | null
          id: string | null
          language: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          show_local_time: boolean | null
          status: Database["public"]["Enums"]["account_status"] | null
          suspended_until: string | null
          timezone: string | null
          updated_at: string | null
          username: string | null
          verified: boolean | null
          website: string | null
          who_can_message: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          city?: never
          city_visible?: boolean | null
          country?: string | null
          created_at?: string | null
          creation_count?: number | null
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string | null
          language?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["account_status"] | null
          suspended_until?: string | null
          timezone?: string | null
          updated_at?: string | null
          username?: string | null
          verified?: boolean | null
          website?: string | null
          who_can_message?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          city?: never
          city_visible?: boolean | null
          country?: string | null
          created_at?: string | null
          creation_count?: number | null
          display_name?: string | null
          follower_count?: number | null
          following_count?: number | null
          id?: string | null
          language?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          status?: Database["public"]["Enums"]["account_status"] | null
          suspended_until?: string | null
          timezone?: string | null
          updated_at?: string | null
          username?: string | null
          verified?: boolean | null
          website?: string | null
          who_can_message?: string | null
        }
        Relationships: []
      }
      feed_creations: {
        Row: {
          audience: Database['public']['Enums']['audience'] | null
          author_id: string | null
          body_excerpt: string | null
          body_truncated: boolean | null
          caption: string | null
          comment_count: number | null
          cover_url: string | null
          created_at: string | null
          genre: string | null
          id: string | null
          language: string | null
          like_count: number | null
          media_url: string | null
          mood: string | null
          published_at: string | null
          save_count: number | null
          title: string | null
          type: Database['public']['Enums']['creation_type'] | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      following_feed: {
        Row: Database['public']['Views']['feed_creations']['Row']
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      library_saved_items: {
        Row: {
          user_id: string
          creation_id: string
          saved_at: string
          is_available: boolean | null
          type: Database['public']['Enums']['creation_type'] | null
          title: string | null
          caption: string | null
          body_excerpt: string | null
          body_truncated: boolean | null
          cover_url: string | null
          published_at: string | null
          like_count: number | null
          comment_count: number | null
          save_count: number | null
          author_id: string | null
          creation_created_at: string | null
          author_username: string | null
          author_display_name: string | null
          author_avatar_url: string | null
          author_verified: boolean | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      library_reading_history: {
        Row: Database['public']['Views']['library_saved_items']['Row'] & {
          percent: number
          position: number
          completed: boolean
          first_read_at: string
          updated_at: string
          resume_chapter_id?: string | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      library_continue_reading: {
        Row: Database['public']['Views']['library_reading_history']['Row']
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      library_highlights: {
        Row: {
          id: string
          user_id: string
          creation_id: string
          chapter_id: string | null
          chapter_title: string | null
          start_paragraph: number
          start_char: number
          end_paragraph: number
          end_char: number
          quote: string
          colour: string
          note: string | null
          created_at: string
          updated_at: string
          is_available: boolean | null
          type: Database['public']['Enums']['creation_type'] | null
          title: string | null
          caption: string | null
          cover_url: string | null
          published_at: string | null
          author_id: string | null
          author_username: string | null
          author_display_name: string | null
          author_avatar_url: string | null
          author_verified: boolean | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      library_collection_items: {
        Row: {
          collection_id: string
          user_id: string
          collection_name: string
          creation_id: string
          added_at: string
          is_available: boolean | null
          type: Database['public']['Enums']['creation_type'] | null
          title: string | null
          caption: string | null
          body_excerpt: string | null
          body_truncated: boolean | null
          cover_url: string | null
          published_at: string | null
          author_id: string | null
          author_username: string | null
          author_display_name: string | null
          author_avatar_url: string | null
          author_verified: boolean | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      book_chapters_toc: {
        Row: {
          id: string
          book_id: string
          position: number
          title: string
          status: Database['public']['Enums']['publish_status']
          is_sample: boolean
          published_at: string | null
          coming_soon: boolean
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      library_books: {
        Row: {
          user_id: string
          book_id: string
          title: string
          cover_url: string | null
          author_id: string
          author_username: string
          author_display_name: string | null
          sale_model: Database['public']['Enums']['book_sale_model']
          percent: number
          last_chapter_id: string | null
          last_read_at: string | null
          reading_status: string
          rental_expires_at: string | null
          rental_days_left: number | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      discover_trending_creations: {
        Row: Database['public']['Views']['feed_creations']['Row'] & {
          country: string | null
          engagement_score: number | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      discover_new_creations: {
        Row: Database['public']['Views']['feed_creations']['Row'] & { country: string | null }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      discover_top_week_creations: {
        Row: Database['public']['Views']['feed_creations']['Row'] & { country: string | null }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      discover_rising_writers: {
        Row: {
          id: string | null
          username: string | null
          display_name: string | null
          avatar_url: string | null
          verified: boolean | null
          follower_count: number | null
          momentum_score: number | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      founder_content_browser: {
        Row: {
          author_display_name: string | null
          author_id: string
          author_username: string | null
          audience: Database["public"]["Enums"]["audience"] | null
          body_excerpt: string | null
          content_id: string
          content_kind: string
          created_at: string
          is_removed: boolean
          published_at: string | null
          removed_reason: string | null
          status: Database["public"]["Enums"]["publish_status"] | null
          title: string | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      founder_report_queue: {
        Row: {
          details: string | null
          moderation_actions_against_user: number
          prior_reports_against_user: number
          reason: Database["public"]["Enums"]["report_reason"]
          report_id: string
          reported_at: string
          reported_display_name: string | null
          reported_user_id: string | null
          reported_user_status: Database["public"]["Enums"]["account_status"] | null
          reported_username: string | null
          reporter_display_name: string | null
          reporter_id: string
          reporter_username: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_snapshot: Json | null
          target_type: Database["public"]["Enums"]["report_target"]
          warnings_against_user: number
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      founder_featured_writers_public: {
        Row: {
          writer_id: string | null
          sort_order: number | null
          username: string | null
          display_name: string | null
          avatar_url: string | null
          verified: boolean | null
          bio: string | null
          follower_count: number | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      notification_feed: {
        Row: {
          id: string
          recipient_id: string
          type: string
          actor_id: string | null
          target_type: string | null
          target_id: string | null
          data: Json
          held: boolean
          created_at: string
          read_at: string | null
          actor_username: string | null
          actor_display_name: string | null
          actor_avatar_url: string | null
          target_title: string | null
          target_excerpt: string | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
      admin_notification_feed: {
        Row: {
          id: string
          recipient_id: string
          type: string
          actor_id: string | null
          target_type: string | null
          target_id: string | null
          data: Json
          created_at: string
          read_at: string | null
          actor_username: string | null
          actor_display_name: string | null
          actor_avatar_url: string | null
        }
        Insert: Record<string, never>
        Update: Record<string, never>
        Relationships: []
      }
    }
    Functions: {
      can_view_creation: { Args: { c: string }; Returns: boolean }
      chosen_username_ok: { Args: { candidate: string }; Returns: boolean }
      counts_as_published: {
        Args: {
          p_removed: boolean
          p_status: Database["public"]["Enums"]["publish_status"]
        }
        Returns: boolean
      }
      founder_email: { Args: never; Returns: string }
      ban_user: {
        Args: { p_report_id?: string; p_reason: string; p_user: string }
        Returns: undefined
      }
      decide_appeal: {
        Args: {
          p_appeal_id: string
          p_decision: Database["public"]["Enums"]["appeal_decision"]
          p_reason: string
        }
        Returns: undefined
      }
      dismiss_report: {
        Args: { p_report_id: string; p_reason: string }
        Returns: undefined
      }
      founder_set_user_status: {
        Args: {
          p_reason: string
          p_report_id?: string
          p_status: Database["public"]["Enums"]["account_status"]
          p_until?: string
          p_user: string
        }
        Returns: undefined
      }
      founder_user_search: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      my_account_restriction: {
        Args: Record<string, never>
        Returns: {
          status: Database["public"]["Enums"]["account_status"]
          status_reason: string | null
          suspended_until: string | null
        }[]
      }
      remove_content: {
        Args: {
          p_report_id?: string
          p_reason: string
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      restore_content: {
        Args: {
          p_report_id?: string
          p_reason: string
          p_target_id: string
          p_target_type: string
        }
        Returns: undefined
      }
      suspend_user: {
        Args: { p_days: number; p_report_id?: string; p_reason: string; p_user: string }
        Returns: undefined
      }
      unban_user: {
        Args: { p_report_id?: string; p_reason: string; p_user: string }
        Returns: undefined
      }
      view_reported_private_content: {
        Args: { p_report_id: string }
        Returns: Json
      }
      warn_user: {
        Args: {
          p_message: string
          p_report_id?: string
          p_reason: string
          p_user: string
        }
        Returns: undefined
      }
      is_active_user: { Args: never; Returns: boolean }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_founder: { Args: never; Returns: boolean }
      notification_unread_count: { Args: Record<string, never>; Returns: number }
      prepare_notification_delivery: { Args: Record<string, never>; Returns: undefined }
      mark_all_notifications_read: { Args: Record<string, never>; Returns: undefined }
      clear_read_notifications: { Args: Record<string, never>; Returns: number }
      search_discovery: {
        Args: { p_query: string; p_tab?: string; p_limit?: number }
        Returns: Json
      }
      writing_prompt_for_date: { Args: { p_on?: string }; Returns: string }
      tag_public_post_count: { Args: { p_tag: string }; Returns: number }
      compute_engagement_score: {
        Args: {
          p_like_count: number
          p_save_count: number
          p_comment_count: number
          p_view_count: number
          p_published_at: string
        }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      username_available: { Args: { candidate: string }; Returns: boolean }
      claim_free_book: { Args: { p_book_id: string }; Returns: string }
      payments_enabled: { Args: Record<string, never>; Returns: boolean }
      user_has_book_entitlement: { Args: { p_user: string; p_book: string }; Returns: boolean }
      can_read_book_chapter: { Args: { p_chapter_id: string }; Returns: boolean }
      reorder_book_chapters: { Args: { p_book_id: string; p_chapter_ids: string[] }; Returns: undefined }
    }
    Enums: {
      book_entitlement_kind: "free" | "purchase" | "rental" | "subscription" | "author"
      book_sale_model: "free" | "purchase" | "rental" | "subscription"
      account_status: "active" | "suspended" | "banned"
      audience: "public" | "unlisted" | "private"
      creation_type:
        | "written_post"
        | "poem"
        | "story"
        | "essay"
        | "article"
        | "lyric"
        | "letter"
        | "script"
        | "journal"
        | "quote_card"
        | "book"
        | "recitation_video"
        | "voice_clip"
        | "podcast"
        | "course"
        | "event"
        | "collab"
      appeal_decision: "upheld" | "overturned"
      mod_action:
        | "dismiss"
        | "remove"
        | "restore"
        | "warn"
        | "suspend"
        | "ban"
        | "unban"
        | "appeal_decision"
        | "private_view"
      publish_status: "draft" | "published" | "unlisted" | "removed"
      report_reason:
        | "spam"
        | "inappropriate"
        | "harassment"
        | "copyright"
        | "other"
      report_status: "open" | "dismissed" | "actioned"
      report_target: "creation" | "chapter" | "comment" | "profile"
      user_role: "reader" | "writer" | "founder"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["active", "suspended", "banned"],
      audience: ["public", "unlisted", "private"],
      creation_type: [
        "written_post",
        "poem",
        "story",
        "essay",
        "article",
        "lyric",
        "letter",
        "script",
        "journal",
        "quote_card",
        "book",
        "recitation_video",
        "voice_clip",
        "podcast",
        "course",
        "event",
        "collab",
      ],
      mod_action: [
        "dismiss",
        "remove",
        "restore",
        "warn",
        "suspend",
        "ban",
        "unban",
        "appeal_decision",
      ],
      book_entitlement_kind: ["free", "purchase", "rental", "subscription", "author"],
      book_sale_model: ["free", "purchase", "rental", "subscription"],
      publish_status: ["draft", "published", "unlisted", "removed"],
      report_reason: [
        "spam",
        "inappropriate",
        "harassment",
        "copyright",
        "other",
      ],
      report_status: ["open", "dismissed", "actioned"],
      report_target: ["creation", "chapter", "comment", "profile"],
      user_role: ["reader", "writer", "founder"],
    },
  },
} as const
