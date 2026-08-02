import 'package:flutter/material.dart';

import '../../l10n/l10n.dart';
import '../../users/user_role.dart';
import '../theme.dart';

class RoleBadge extends StatelessWidget {
  const RoleBadge({super.key, required this.role});

  final UserRole role;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(color: AppColors.brandOf(context), width: 2),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.only(bottom: 2),
        child: Text(
          role.label(context.l10n).toUpperCase(),
          style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: AppColors.brandOf(context),
                fontSize: 11,
                letterSpacing: 1.4,
                fontWeight: FontWeight.w800,
              ),
        ),
      ),
    );
  }
}
