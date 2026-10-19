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
      chapters: {
        Row: {
          body_json: Json | null
          body_text: string | null
          book_id: string
          created_at: string
          id: string
          is_removed: boolean
          position: number
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["publish_status"]
          title: string | null
          updated_at: string
        }
        Insert: {
          body_json?: Json | null
          body_text?: string | null
          book_id: string
          created_at?: string
          id?: string
          is_removed?: boolean
          position: number
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string | null
          updated_at?: string
        }
        Update: {
          body_json?: Json | null
          body_text?: string | null
          book_id?: string
          created_at?: string
          id?: string
          is_removed?: boolean
          position?: number
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["publish_status"]
          title?: string | null
          updated_at?: string
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
          percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          chapter_id?: string | null
          percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          chapter_id?: string | null
          percent?: number
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
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
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
      founder_set_user_status: {
        Args: {
          p_reason: string
          p_status: Database["public"]["Enums"]["account_status"]
          p_until?: string
          p_user: string
        }
        Returns: undefined
      }
      is_active_user: { Args: never; Returns: boolean }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_founder: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      username_available: { Args: { candidate: string }; Returns: boolean }
    }
    Enums: {
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
      mod_action:
        | "dismiss"
        | "remove"
        | "restore"
        | "warn"
        | "suspend"
        | "ban"
        | "unban"
        | "appeal_decision"
      publish_status: "draft" | "published" | "removed"
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
      publish_status: ["draft", "published", "removed"],
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
