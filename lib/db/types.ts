export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      cases: {
        Row: {
          created_at: string;
          director_id: string;
          family_name: string;
          id: string;
          questionnaire_token: string;
          status: Database["public"]["Enums"]["case_status"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          director_id: string;
          family_name: string;
          id?: string;
          questionnaire_token: string;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          director_id?: string;
          family_name?: string;
          id?: string;
          questionnaire_token?: string;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      obituary_drafts: {
        Row: {
          ai_provider: string;
          case_id: string;
          content: string;
          generated_at: string;
          id: string;
          model: string;
          updated_at: string;
        };
        Insert: {
          ai_provider: string;
          case_id: string;
          content: string;
          generated_at?: string;
          id?: string;
          model: string;
          updated_at?: string;
        };
        Update: {
          ai_provider?: string;
          case_id?: string;
          content?: string;
          generated_at?: string;
          id?: string;
          model?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      obituary_edits: {
        Row: {
          case_id: string;
          content_after: string;
          content_before: string;
          director_id: string;
          edited_at: string;
          id: string;
        };
        Insert: {
          case_id: string;
          content_after: string;
          content_before: string;
          director_id: string;
          edited_at?: string;
          id?: string;
        };
        Update: {
          case_id?: string;
          content_after?: string;
          content_before?: string;
          director_id?: string;
          edited_at?: string;
          id?: string;
        };
        Relationships: [];
      };
      questionnaire_responses: {
        Row: {
          answer: string;
          case_id: string;
          created_at: string;
          id: string;
          question_key: string;
        };
        Insert: {
          answer: string;
          case_id: string;
          created_at?: string;
          id?: string;
          question_key: string;
        };
        Update: {
          answer?: string;
          case_id?: string;
          created_at?: string;
          id?: string;
          question_key?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      case_status: "questionnaire_sent" | "draft_ready" | "delivered";
    };
    CompositeTypes: Record<string, never>;
  };
};
