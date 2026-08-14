import 'package:flutter/material.dart';

class ProfileBadge {
  const ProfileBadge({
    required this.text,
    required this.icon,
    required this.backgroundColor,
  });

  final String text;
  final String icon;
  final Color backgroundColor;

  static ProfileBadge? fromMap(Object? raw) {
    if (raw is! Map) return null;
    if (raw['enabled'] == false) return null;
    final assigned = raw['assigned'] == true || raw['enabled'] == true;
    if (!assigned) return null;
    final text = '${raw['text'] ?? ''}'.trim();
    if (text.isEmpty) return null;
    final background = raw['backgroundColor'] ?? raw['color'] ?? '#1F6B4A';
    return ProfileBadge(
      text: text.length > 40 ? text.substring(0, 40) : text,
      icon: '${raw['icon'] ?? 'badge'}',
      backgroundColor: parseBadgeColor('$background'),
    );
  }
}

Color parseBadgeColor(String hexOrToken) {
  const accents = {
    'green': 0xFF1F6B4A,
    'amber': 0xFFF5A524,
    'teal': 0xFF0D9488,
    'blue': 0xFF2563EB,
    'violet': 0xFF7C3AED,
    'rose': 0xFFE11D48,
    'accent': 0xFF1F6B4A,
  };
  final token = hexOrToken.trim().toLowerCase();
  if (accents.containsKey(token)) return Color(accents[token]!);
  var raw = hexOrToken.trim().replaceFirst('#', '');
  if (raw.length == 6) raw = 'FF$raw';
  final parsed = int.tryParse(raw, radix: 16);
  return Color(parsed ?? 0xFF1F6B4A);
}

IconData badgeIconData(String name) {
  return switch (name) {
    'verified' => Icons.verified_rounded,
    'star' => Icons.star_rounded,
    'school' => Icons.school_rounded,
    'workspace_premium' => Icons.workspace_premium_rounded,
    'military_tech' => Icons.military_tech_rounded,
    'handshake' => Icons.handshake_rounded,
    'groups' => Icons.groups_rounded,
    'campaign' => Icons.campaign_rounded,
    'psychology' => Icons.psychology_rounded,
    'favorite' => Icons.favorite_rounded,
    'bolt' => Icons.bolt_rounded,
    'public' => Icons.public_rounded,
    'health_and_safety' => Icons.health_and_safety_rounded,
    'emoji_events' => Icons.emoji_events_rounded,
    'support_agent' => Icons.support_agent_rounded,
    'admin_panel_settings' => Icons.admin_panel_settings_rounded,
    'auto_awesome' => Icons.auto_awesome_rounded,
    _ => Icons.badge_rounded,
  };
}
