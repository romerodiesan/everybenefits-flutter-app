import 'package:flutter/material.dart';

import '../../users/user_role.dart';
import '../theme.dart';

class RoleBadge extends StatelessWidget {
  const RoleBadge({super.key, required this.role});

  final UserRole role;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.accent, width: 2),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 2),
        child: Text(
          role.label.toUpperCase(),
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: AppColors.accent,
                fontSize: 11,
                letterSpacing: 1.4,
                fontWeight: FontWeight.w800,
              ),
        ),
      ),
    );
  }
}
